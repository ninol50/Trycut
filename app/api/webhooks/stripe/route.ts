import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, planForPrice } from '@/lib/stripe';
import { createAdminSupabase } from '@/lib/supabase/server';
import { env, isStripeConfigured, isSupabaseConfigured } from '@/lib/env';
import type { SubscriptionStatus } from '@/types/db';

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
      default:
        break;
    }
  } catch (error) {
    console.error('[webhooks/stripe]', event.type, error);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

type Admin = ReturnType<typeof createAdminSupabase>;

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
    await admin
      .from('profiles')
      .update({ stripe_customer_id: session.customer })
      .eq('id', userId);
  }

  // Le paiement unique n'a pas d'abonnement : les crédits sont accordés ici.
  if (session.mode === 'payment') {
    const items = await getStripe().checkout.sessions.listLineItems(session.id, { limit: 1 });
    const priceId = items.data[0]?.price?.id;
    const mapped = planForPrice(priceId);
    if (!mapped) return;

    await admin.rpc('grant_credits', {
      p_user_id: userId,
      p_amount: mapped.credits,
      p_reason: 'pack_grant',
    });
    await admin
      .from('profiles')
      .update({ plan: mapped.plan, subscription_status: 'active' })
      .eq('id', userId);
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

  const priceId = subscription.items.data[0]?.price.id;
  const mapped = planForPrice(priceId);
  const status = STATUS_MAP[subscription.status] ?? 'none';
  const canceled = subscription.status === 'canceled' || status === 'canceled';

  await admin
    .from('profiles')
    .update({
      // L'accès reste actif jusqu'à current_period_end : c'est la date qui tranche,
      // pas la résiliation elle-même.
      subscription_status: status,
      plan: canceled ? 'free' : (mapped?.plan ?? 'free'),
      current_period_end: periodEnd(subscription),
    })
    .eq('id', userId);
}

async function handleInvoicePaid(invoice: Stripe.Invoice, admin: Admin): Promise<void> {
  const customer = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customer) return;

  const userId = await userIdForCustomer(customer, admin);
  if (!userId) return;

  const rawPrice = invoice.lines.data[0]?.pricing?.price_details?.price;
  const priceId = typeof rawPrice === 'string' ? rawPrice : rawPrice?.id;
  const mapped = planForPrice(priceId);
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
    await admin.rpc('grant_credits', {
      p_user_id: userId,
      p_amount: delta,
      p_reason: 'subscription_grant',
    });
  }

  await admin
    .from('profiles')
    .update({ plan: mapped.plan, subscription_status: 'active' })
    .eq('id', userId);
}
