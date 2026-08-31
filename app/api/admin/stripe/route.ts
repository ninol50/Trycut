import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { z } from 'zod';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { loadProfile } from '@/lib/profile';
import { isSupabaseConfigured, env } from '@/lib/env';
import { resolveStripeConfig } from '@/lib/stripe-config';
import { stripeWith } from '@/lib/stripe';
import { PLAN_BY_AMOUNT_CENTS } from '@/lib/pricing';

export const runtime = 'nodejs';

/**
 * Réglages Stripe posés depuis la page admin.
 *
 * Ils existent ici parce que passer par l'hébergeur suppose un ordinateur, un
 * redéploiement, et surtout aucun retour : une variable qui n'atteint pas le
 * serveur ne le dit nulle part. Ici, le résultat est vérifiable dans la
 * seconde. La clé part en écriture seule — jamais relue, jamais réaffichée.
 */
const schema = z.union([
  z.object({ action: z.literal('cle'), valeur: z.string().min(10).max(400) }),
  z.object({ action: z.literal('retirer') }),
  z.object({ action: z.literal('configurer') }),
]);

/** Les seuls événements que le webhook sait traiter. */
const EVENEMENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
];

interface Statut {
  cle: boolean;
  webhook: boolean;
  prix: number;
  modeTest: boolean;
}

async function lireStatut(): Promise<Statut | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('admin_stripe_status');
  if (error) return null;

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        cle_posee: boolean;
        secret_webhook_pose: boolean;
        prix_poses: number;
        mode_test: boolean;
      }
    | undefined;

  return {
    cle: Boolean(row?.cle_posee),
    webhook: Boolean(row?.secret_webhook_pose),
    prix: Number(row?.prix_poses ?? 0),
    modeTest: Boolean(row?.mode_test),
  };
}

export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json({ cle: false }, { status: 503 });

  const statut = await lireStatut();
  if (!statut) return NextResponse.json({ cle: false }, { status: 403 });
  return NextResponse.json(statut);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: false }, { status: 503 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Demande invalide.' }, { status: 400 });
  }

  const supabase = await createServerSupabase();

  if (parsed.data.action === 'cle' || parsed.data.action === 'retirer') {
    const { error } =
      parsed.data.action === 'cle'
        ? await supabase.rpc('admin_set_stripe_key', { p_key: parsed.data.valeur })
        : await supabase.rpc('admin_clear_stripe_key');

    if (error) {
      const interdit = error.code === '42501' || error.message.includes('administrateur');
      if (interdit) return NextResponse.json({ ok: false }, { status: 403 });
      return NextResponse.json(
        {
          ok: false,
          message: error.message.includes('illisible')
            ? 'Cette clé n’a pas la forme d’une clé Stripe. Elle commence par « sk_ ».'
            : 'L’enregistrement a échoué. Réessaie.',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, ...(await lireStatut()) });
  }

  return configurer();
}

/**
 * Branche Stripe de bout en bout avec la clé enregistrée : retrouve les trois
 * tarifs par leur montant, puis crée le webhook et garde son secret.
 *
 * Le secret de signature n'est renvoyé par Stripe qu'à la création : c'est la
 * raison d'être de cette route. Un webhook existant vers la même adresse est
 * remplacé, sinon son secret resterait à jamais hors de portée.
 */
async function configurer(): Promise<NextResponse> {
  const session = await loadProfile();
  if (!session?.profile.is_admin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const admin = createAdminSupabase();
  if (!admin) {
    return NextResponse.json(
      { ok: false, message: 'La clé de service Supabase manque : écriture impossible.' },
      { status: 503 },
    );
  }

  const config = await resolveStripeConfig();
  if (!config.secretKey) {
    return NextResponse.json(
      { ok: false, message: 'Enregistre d’abord la clé secrète Stripe.' },
      { status: 400 },
    );
  }

  const stripe = stripeWith(config.secretKey);
  const url = `${env.siteUrl}/api/webhooks/stripe`;
  const majs: Record<string, string> = {};
  const faits: string[] = [];

  // --- Les trois tarifs, retrouvés par leur montant ------------------------
  // Les liens de paiement ne disent pas quel `price_...` ils portent : on les
  // reconnaît au montant, seule donnée que le site et Stripe partagent.
  const colonne: Record<string, string> = {
    pack: 'stripe_price_pack',
    pass: 'stripe_price_pass',
    trimestre: 'stripe_price_trimestre',
  };

  try {
    const prices = await stripe.prices.list({ active: true, limit: 100 });
    for (const price of prices.data) {
      if (!price.recurring || price.currency !== 'eur') continue;
      const offre = PLAN_BY_AMOUNT_CENTS[price.unit_amount ?? -1];
      const cible = offre ? colonne[offre.plan] : undefined;
      if (cible && !majs[cible]) majs[cible] = price.id;
    }
    faits.push(`${Object.keys(majs).length} tarif(s) sur 3 reconnus`);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error && error.message.includes('Invalid API Key')
            ? 'Stripe refuse la clé. Vérifie que tu as collé la clé secrète en entier.'
            : 'Stripe n’a pas répondu. Réessaie dans un instant.',
      },
      { status: 502 },
    );
  }

  // --- Le webhook ----------------------------------------------------------
  try {
    const existants = await stripe.webhookEndpoints.list({ limit: 100 });
    for (const endpoint of existants.data) {
      if (endpoint.url === url) await stripe.webhookEndpoints.del(endpoint.id);
    }

    const cree = await stripe.webhookEndpoints.create({
      url,
      enabled_events: EVENEMENTS,
      description: 'Trycut — crédite les comptes après paiement',
    });

    if (cree.secret) {
      majs['stripe_webhook_secret'] = cree.secret;
      faits.push('webhook créé et signé');
    }
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Le webhook n’a pas pu être créé chez Stripe.' },
      { status: 502 },
    );
  }

  const { error } = await admin.from('app_config').update(majs).eq('id', 1);
  if (error) {
    return NextResponse.json(
      { ok: false, message: 'Les réglages n’ont pas pu être enregistrés.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, faits, ...(await lireStatut()) });
}
