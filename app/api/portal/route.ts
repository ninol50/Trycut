import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { loadProfile } from '@/lib/profile';
import { env, isStripeConfigured } from '@/lib/env';

export const runtime = 'nodejs';

/** Portail client Stripe : résiliation, moyens de paiement, factures. */
export async function POST() {
  if (!isStripeConfigured) {
    return NextResponse.json({ error: 'stripe' }, { status: 503 });
  }

  const session = await loadProfile();
  if (!session) return NextResponse.json({ error: 'auth' }, { status: 401 });

  const customerId = session.profile.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: 'aucun_abonnement' }, { status: 400 });
  }

  const portal = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.siteUrl}/compte`,
  });

  return NextResponse.json({ url: portal.url });
}
