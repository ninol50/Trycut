import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionContext } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, priceIdFor } from '@/lib/stripe';
import { siteUrl } from '@/lib/env';

export const runtime = 'nodejs';

const schema = z.object({ offer: z.enum(['pack', 'pass']) });

/**
 * Ouverture d'une session Stripe Checkout.
 *
 * `payment` pour le pack (paiement unique), `subscription` pour le pass. Le
 * verrouillage est serveur : le plan et les crédits ne sont jamais accordés
 * ici, uniquement par le webhook après confirmation de paiement.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Offre inconnue.' }, { status: 400 });
  }

  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json(
      { message: 'Connecte-toi pour finaliser ton achat.', redirect: '/connexion?suite=/tarifs' },
      { status: 401 },
    );
  }

  const { offer } = parsed.data;

  try {
    const stripe = getStripe();
    const admin = createAdminClient();

    // Un seul client Stripe par profil : sans ça, le portail et l'historique
    // de facturation se dispersent sur plusieurs identités.
    let customerId = session.profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.profile.email,
        metadata: { supabase_user_id: session.user.id },
      });
      customerId = customer.id;
      await admin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', session.user.id);
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: offer === 'pack' ? 'payment' : 'subscription',
      customer: customerId,
      line_items: [{ price: priceIdFor(offer), quantity: 1 }],
      success_url: `${siteUrl()}/compte?paiement=ok`,
      cancel_url: `${siteUrl()}/tarifs?paiement=annule`,
      locale: 'fr',
      allow_promotion_codes: true,
      client_reference_id: session.user.id,
      metadata: { supabase_user_id: session.user.id, offer },
      ...(offer === 'pass'
        ? { subscription_data: { metadata: { supabase_user_id: session.user.id } } }
        : {}),
    });

    if (!checkout.url) {
      return NextResponse.json({ message: 'Stripe n’a pas renvoyé d’URL.' }, { status: 502 });
    }

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error('[checkout] échec', error);
    return NextResponse.json(
      { message: 'Le paiement est indisponible pour le moment. Réessaie.' },
      { status: 503 },
    );
  }
}
