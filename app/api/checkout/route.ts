import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { stripeWith } from '@/lib/stripe';
import { resolveStripeConfig } from '@/lib/stripe-config';
import { createServerSupabase } from '@/lib/supabase/server';
import { loadProfile } from '@/lib/profile';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

/**
 * Checkout Stripe. Abonnement par défaut ; le paiement unique n'est proposé
 * que si `ENABLE_ONE_TIME_PACK` est activé (défaut : false).
 */
const schema = z.object({ plan: z.enum(['pack', 'pass', 'trimestre']) });

export async function POST(request: NextRequest) {
  const config = await resolveStripeConfig();
  if (!config.secretKey) {
    return NextResponse.json(
      { error: 'stripe', message: 'Le paiement n’est pas encore configuré.' },
      { status: 503 },
    );
  }

  const session = await loadProfile();
  if (!session) {
    return NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'requete' }, { status: 400 });
  }

  const { plan } = parsed.data;
  const priceId =
    plan === 'pack'
      ? config.pricePack
      : plan === 'pass'
        ? config.pricePass
        : config.priceTrimestre;

  if (!priceId) {
    return NextResponse.json(
      { error: 'stripe', message: 'Ce tarif n’est pas configuré.' },
      { status: 503 },
    );
  }

  const stripe = stripeWith(config.secretKey);
  const supabase = await createServerSupabase();

  // Un seul client Stripe par compte.
  let customerId = session.profile.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: { user_id: session.user.id },
    });
    customerId = customer.id;
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', session.user.id);
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: session.user.id,
    metadata: { user_id: session.user.id, plan },
    success_url: `${env.siteUrl}/compte?paiement=ok`,
    cancel_url: `${env.siteUrl}/tarifs?paiement=annule`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkout.url });
}
