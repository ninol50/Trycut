import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';
import { PACK_CREDITS, PASS_MONTHLY_CREDITS } from '@/lib/offers';
import { requireEnv } from '@/lib/env';
import type { SubscriptionStatus } from '@/lib/types/db';

export const runtime = 'nodejs';

/**
 * Webhook Stripe.
 *
 * Idempotent par construction : `webhook_events (provider, external_id)` est
 * unique, et `event.id` sert de clé. Stripe rejoue ses événements, parfois
 * plusieurs fois — sans cette barrière, un `checkout.session.completed`
 * recréditerait un pack à chaque rejeu.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ message: 'Signature absente.' }, { status: 400 });
  }

  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      raw,
      signature,
      requireEnv('STRIPE_WEBHOOK_SECRET'),
    );
  } catch (error) {
    console.error('[webhook:stripe] signature invalide', error);
    return NextResponse.json({ message: 'Signature invalide.' }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ message: 'Service indisponible.' }, { status: 503 });
  }

  const { error: dedupeError } = await admin.from('webhook_events').insert({
    provider: 'stripe',
    external_id: event.id,
    payload: { type: event.type },
  });

  if (dedupeError) {
    if (dedupeError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('[webhook:stripe] journalisation impossible', dedupeError.message);
    // On refuse plutôt que de risquer un double crédit : Stripe rejouera.
    return NextResponse.json({ message: 'Journalisation impossible.' }, { status: 500 });
  }

  try {
    await handleEvent(event, admin);
  } catch (error) {
    console.error('[webhook:stripe] traitement échoué', event.type, error);
    return NextResponse.json({ message: 'Traitement échoué.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

type Admin = ReturnType<typeof createAdminClient>;

async function handleEvent(event: Stripe.Event, admin: Admin): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = await resolveUserId(admin, session.metadata, session.customer);
      if (!userId) return;

      if (session.mode === 'payment') {
        // Pack : 15 essais, valables 6 mois.
        await admin.rpc('add_credits', {
          p_user_id: userId,
          p_amount: PACK_CREDITS,
          p_reason: 'pack_purchase',
        });
      }
      // Le pass est crédité par `invoice.paid`, qui couvre aussi les
      // renouvellements mensuels.
      return;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      const userId = await resolveUserId(admin, null, invoice.customer);
      if (!userId) return;

      const periodEnd = extractPeriodEnd(invoice);

      // Crédits du pass non reportables : on remet le compteur à 60 plutôt
      // que d'additionner.
      await setPassCredits(admin, userId, PASS_MONTHLY_CREDITS, periodEnd);
      return;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const subscription = event.data.object;
      const userId = await resolveUserId(admin, subscription.metadata, subscription.customer);
      if (!userId) return;

      const status = mapStatus(subscription.status);
      await admin
        .from('profiles')
        .update({
          subscription_status: status,
          plan: status === 'active' ? 'pass' : 'free',
        })
        .eq('id', userId);
      return;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const userId = await resolveUserId(admin, subscription.metadata, subscription.customer);
      if (!userId) return;

      // Résiliation : retour au plan gratuit. Les crédits déjà acquis restent
      // acquis, mais le catalogue premium se referme.
      await admin
        .from('profiles')
        .update({
          subscription_status: 'canceled',
          plan: 'free',
          current_period_end: null,
        })
        .eq('id', userId);
      return;
    }

    default:
      return;
  }
}

async function setPassCredits(
  admin: Admin,
  userId: string,
  credits: number,
  periodEnd: string | null,
): Promise<void> {
  const { data: profile } = await admin
    .from('profiles')
    .select('credits_remaining')
    .eq('id', userId)
    .maybeSingle<{ credits_remaining: number }>();

  const current = profile?.credits_remaining ?? 0;

  await admin
    .from('profiles')
    .update({
      credits_remaining: credits,
      plan: 'pass',
      subscription_status: 'active',
      current_period_end: periodEnd,
    })
    .eq('id', userId);

  // Le ledger reflète le delta réel appliqué au solde, pas le forfait brut.
  await admin.from('credit_ledger').insert({
    user_id: userId,
    delta: credits - current,
    reason: 'subscription_grant',
  });
}

async function resolveUserId(
  admin: Admin,
  metadata: Stripe.Metadata | null | undefined,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | null> {
  const fromMetadata = metadata?.['supabase_user_id'];
  if (typeof fromMetadata === 'string' && fromMetadata.length > 0) return fromMetadata;

  const customerId = typeof customer === 'string' ? customer : (customer?.id ?? null);
  if (!customerId) return null;

  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'none';
  }
}

/**
 * `period_end` a migré entre versions d'API : il vit tantôt sur la facture,
 * tantôt sur ses lignes. On lit les deux plutôt que de dépendre d'une seule.
 */
function extractPeriodEnd(invoice: Stripe.Invoice): string | null {
  const direct = (invoice as unknown as { period_end?: unknown }).period_end;
  if (typeof direct === 'number') return new Date(direct * 1000).toISOString();

  const line = invoice.lines?.data?.[0] as unknown as
    | { period?: { end?: unknown } }
    | undefined;
  const end = line?.period?.end;
  return typeof end === 'number' ? new Date(end * 1000).toISOString() : null;
}
