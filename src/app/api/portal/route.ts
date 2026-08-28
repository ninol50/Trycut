import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { siteUrl } from '@/lib/env';

export const runtime = 'nodejs';

/** Portail client Stripe : gestion du moyen de paiement et résiliation. */
export async function POST(): Promise<NextResponse> {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ message: 'Connecte-toi d’abord.' }, { status: 401 });
  }

  if (!session.profile.stripe_customer_id) {
    return NextResponse.json(
      { message: 'Aucun achat n’est encore rattaché à ce compte.' },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: session.profile.stripe_customer_id,
      return_url: `${siteUrl()}/compte`,
      locale: 'fr',
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error('[portal] échec', error);
    return NextResponse.json(
      { message: 'Le portail de facturation est indisponible. Réessaie.' },
      { status: 503 },
    );
  }
}
