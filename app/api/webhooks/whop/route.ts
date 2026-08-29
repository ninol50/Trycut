import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';
import { env, isSupabaseConfigured } from '@/lib/env';
import { sendSubscriptionEmail } from '@/lib/email';
import {
  GRANTING_EVENTS,
  REVOKING_EVENTS,
  eventName,
  extractAmountCents,
  extractEmail,
  extractUserRef,
  planForPayload,
  readWhopHeaders,
  verifyWhopSignature,
} from '@/lib/whop';

export const runtime = 'nodejs';

type Admin = NonNullable<ReturnType<typeof createAdminSupabase>>;

/** Une écriture ratée ici ne doit jamais passer inaperçue : un paiement
 *  encaissé sans coupes créditées est un client perdu et un litige. */
async function must<T extends { error: { message: string } | null }>(
  label: string,
  query: PromiseLike<T>,
): Promise<T> {
  const result = await query;
  if (result.error) throw new Error(`${label} : ${result.error.message}`);
  return result;
}

/**
 * Webhook Whop.
 *
 * Idempotent via `webhook_events.external_id` : les webhooks arrivent en
 * double, et créditer deux fois le même paiement est une perte sèche.
 *
 * Le rattachement au compte se fait par l'email de l'acheteur. Whop ne
 * transmet de métadonnées que sur une session créée par son API ; sur une
 * page d'offre publique, l'email est le seul lien fiable. C'est pour ça que la
 * page tarifs demande de payer avec l'adresse du compte.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured || !env.whopWebhookSecret) {
    return NextResponse.json({ error: 'indisponible' }, { status: 503 });
  }

  const raw = await request.text();
  const headers = readWhopHeaders((name) => request.headers.get(name));

  if (!verifyWhopSignature(raw, headers, env.whopWebhookSecret)) {
    console.error('[webhooks/whop] signature refusée');
    return NextResponse.json({ error: 'signature' }, { status: 400 });
  }

  const payload: unknown = JSON.parse(raw);
  const event = eventName(payload);

  const admin = createAdminSupabase();
  if (!admin) {
    console.error('[webhooks/whop] SUPABASE_SERVICE_ROLE_KEY absente');
    return NextResponse.json({ error: 'service_role_manquante' }, { status: 503 });
  }

  // Corps complet journalisé : c'est ce qui permettra de resserrer la lecture
  // des champs sur un vrai paiement plutôt que sur une supposition.
  console.log('[webhooks/whop]', event, raw.slice(0, 2000));

  const { error: dedupe } = await admin
    .from('webhook_events')
    .insert({ provider: 'whop', external_id: headers.id, payload: { event } });

  if (dedupe) return NextResponse.json({ received: true, duplicate: true });

  try {
    if ((GRANTING_EVENTS as readonly string[]).includes(event)) {
      await grant(payload, admin);
    } else if ((REVOKING_EVENTS as readonly string[]).includes(event)) {
      await revoke(payload, admin, event);
    }
  } catch (error) {
    console.error('[webhooks/whop] traitement', error);
    // 500 : Whop réessaiera, et la ligne de déduplication a été posée sous la
    // même transaction que l'échec, donc le rejeu repassera.
    await admin.from('webhook_events').delete().eq('external_id', headers.id);
    return NextResponse.json({ error: 'traitement' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function findUser(payload: unknown, admin: Admin) {
  const ref = extractUserRef(payload);
  if (ref) {
    const { data } = await admin
      .from('profiles')
      .select('id, email, first_name')
      .eq('id', ref)
      .maybeSingle();
    if (data) return data;
  }

  const email = extractEmail(payload);
  if (!email) return null;

  const { data } = await admin
    .from('profiles')
    .select('id, email, first_name')
    .ilike('email', email)
    .maybeSingle();

  return data;
}

async function grant(payload: unknown, admin: Admin) {
  const profile = await findUser(payload, admin);
  if (!profile) {
    // Payé avec une autre adresse que celle du compte : à rattacher à la main
    // depuis /admin. On le dit fort dans les journaux plutôt que d'échouer en
    // silence.
    console.error('[webhooks/whop] paiement sans compte correspondant', extractEmail(payload));
    return;
  }

  const mapped = planForPayload(payload);
  if (!mapped) {
    console.error('[webhooks/whop] offre inconnue', extractAmountCents(payload));
    return;
  }

  await must(
    'octroi des coupes',
    admin.rpc('grant_credits', {
      p_user_id: profile.id,
      p_amount: mapped.credits,
      p_reason: 'subscription_grant',
    }),
  );

  await must(
    'activation de l’abonnement',
    admin
      .from('profiles')
      .update({ plan: mapped.plan, subscription_status: 'active' })
      .eq('id', profile.id),
  );

  if (profile.email) {
    void sendSubscriptionEmail(
      profile.email,
      mapped.plan === 'pack' ? 'abonnement à la semaine' : 'abonnement au mois',
      mapped.credits,
    ).catch(() => undefined);
  }
}

async function revoke(payload: unknown, admin: Admin, event: string) {
  const profile = await findUser(payload, admin);
  if (!profile) return;

  const failed = event.includes('payment');

  await must(
    'fermeture de l’accès',
    admin
      .from('profiles')
      .update(
        failed
          ? { subscription_status: 'past_due' }
          : { subscription_status: 'canceled', plan: 'free' },
      )
      .eq('id', profile.id),
  );
}
