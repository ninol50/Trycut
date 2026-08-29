import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, planForPrice } from '@/lib/stripe';
import { createAdminSupabase } from '@/lib/supabase/server';
import { env, isStripeConfigured, isSupabaseConfigured } from '@/lib/env';
import type { SubscriptionStatus } from '@/types/db';
import { sendSubscriptionEmail } from '@/lib/email';

export const runtime = 'nodejs';

/**
 * Webhook Stripe. Idempotent via `webhook_events.external_id` : les webhooks
 * arrivent en double systématiquement.
 */
export async function POST(request: NextRequest) {
  if (!isStripeConfigured || !isSupabaseConfigured || !env.stripeWebhookSecret) {
    return NextResponse.json({ error: 'indisponible' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'signature' }, { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(raw, signature, env.stripeWebhookSecret);
  } catch (error) {
    console.error('[webhooks/stripe] signature', error);
    return NextResponse.json({ error: 'signature' }, { status: 400 });
  }

  const admin = createAdminSupabase();
  if (!admin) {
    // Créditer un compte ne peut pas passer par la session d'un client :
    // sinon n'importe qui se créditerait lui-même.
    console.error('[webhooks/stripe] SUPABASE_SERVICE_ROLE_KEY absente');
    return NextResponse.json({ error: 'service_role_manquante' }, { status: 503 });
  }

  const { error: dedupeError } = await admin
    .from('webhook_events')
    .insert({ provider: 'stripe', external_id: event.id, payload: { type: event.type } });

  if (dedupeError) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object, admin);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await handleSubscriptionChange(event.data.object, admin);
        break;
      }
      case 'invoice.paid': {
        await handleInvoicePaid(event.data.object, admin);
        break;
      }
      case 'invoice.payment_failed': {
        // Paiement refusé : l'accès est coupé jusqu'au règlement. Les coupes
        // restantes sont conservées, elles reviennent avec le paiement.
        await handlePaymentFailed(event.data.object, admin);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error('[webhooks/stripe]', event.type, error);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

type Admin = NonNullable<ReturnType<typeof createAdminSupabase>>;

/**
 * Une écriture ratée dans un webhook ne doit jamais passer inaperçue : Stripe
 * a encaissé, le compte doit suivre. On lève, le webhook répond 500, et Stripe
 * rejoue — le traitement est idempotent.
 *
 * C'est l'absence de ce contrôle qui a laissé passer une écriture `plan = 'pack'`
 * rejetée par l'énumération : l'abonné restait en offre gratuite.
 */
async function must<T extends { error: { message: string } | null }>(
  label: string,
  query: PromiseLike<T>,
): Promise<T> {
  const result = await query;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result;
}


async function userIdForCustomer(customer: string, admin: Admin): Promise<string | null> {
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customer)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  admin: Admin,
): Promise<void> {
  const userId =
    session.client_reference_id ??
    session.metadata?.['user_id'] ??
    (typeof session.customer === 'string'
      ? await userIdForCustomer(session.customer, admin)
      : null);

  if (!userId) return;

  if (typeof session.customer === 'string') {
    await must(
      'enregistrement du client Stripe',
      admin.from('profiles').update({ stripe_customer_id: session.customer }).eq('id', userId),
    );
  }

  // Les liens de paiement Stripe ne portent pas d'identifiant de prix connu :
  // on lit la ligne facturée et on retombe sur le montant.
  const items = await getStripe().checkout.sessions.listLineItems(session.id, { limit: 1 });
  const line = items.data[0];
  const mapped = planForPrice(line?.price?.id, line?.amount_total ?? session.amount_total);
  if (!mapped) return;

  await must(
    'octroi des coupes',
    admin.rpc('grant_credits', {
      p_user_id: userId,
      p_amount: mapped.credits,
      p_reason: session.mode === 'payment' ? 'pack_grant' : 'subscription_grant',
    }),
  );
  await must(
    'activation de l’offre',
    admin
      .from('profiles')
      .update({ plan: mapped.plan, subscription_status: 'active' })
      .eq('id', userId),
  );

  const email = session.customer_details?.email ?? null;
  if (email) {
    void sendSubscriptionEmail(
      email,
      mapped.plan === 'pack' ? 'Pack' : 'Pass',
      mapped.credits,
    ).catch(() => undefined);
  }
}

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: 'active',
  trialing: 'active',
  past_due: 'past_due',
  unpaid: 'past_due',
  canceled: 'canceled',
  incomplete_expired: 'canceled',
};

function periodEnd(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  const raw = item?.current_period_end;
  return typeof raw === 'number' ? new Date(raw * 1000).toISOString() : null;
}

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  admin: Admin,
): Promise<void> {
  const customer =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const userId = await userIdForCustomer(customer, admin);
  if (!userId) return;

  const price = subscription.items.data[0]?.price;
  const mapped = planForPrice(price?.id, price?.unit_amount ?? null);
  const status = STATUS_MAP[subscription.status] ?? 'none';
  const canceled = subscription.status === 'canceled' || status === 'canceled';

  await must(
    'mise à jour de l’abonnement',
    admin
      .from('profiles')
      .update({
        // L'accès reste actif jusqu'à current_period_end : c'est la date qui tranche,
        // pas la résiliation elle-même.
        subscription_status: status,
        plan: canceled ? 'free' : (mapped?.plan ?? 'free'),
        current_period_end: periodEnd(subscription),
      })
      .eq('id', userId),
  );
}

async function handleInvoicePaid(invoice: Stripe.Invoice, admin: Admin): Promise<void> {
  const customer = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customer) return;

  const userId = await userIdForCustomer(customer, admin);
  if (!userId) return;

  const line = invoice.lines.data[0];
  const rawPrice = line?.pricing?.price_details?.price;
  const priceId = typeof rawPrice === 'string' ? rawPrice : rawPrice?.id;
  const mapped = planForPrice(priceId, line?.amount ?? null);
  if (!mapped) return;

  // Crédits du mois. Non reportables : on remet le solde au forfait,
  // on ne cumule pas.
  const { data: profile } = await admin
    .from('profiles')
    .select('credits_remaining')
    .eq('id', userId)
    .maybeSingle();

  const current = (profile as { credits_remaining: number } | null)?.credits_remaining ?? 0;
  const delta = mapped.credits - current;

  if (delta !== 0) {
    await must(
      'recharge mensuelle',
      admin.rpc('grant_credits', {
        p_user_id: userId,
        p_amount: delta,
        p_reason: 'subscription_grant',
      }),
    );
  }

  await must(
    'confirmation de l’offre',
    admin.from('profiles').update({ plan: mapped.plan, subscription_status: 'active' }).eq('id', userId),
  );
}

async function handlePaymentFailed(invoice: Stripe.Invoice, admin: Admin): Promise<void> {
  const customer = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customer) return;

  const userId = await userIdForCustomer(customer, admin);
  if (!userId) return;

  await must(
    'coupure de l’accès sur impayé',
    admin.from('profiles').update({ subscription_status: 'past_due' }).eq('id', userId),
  );
}
