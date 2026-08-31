import Stripe from 'stripe';
import { env } from '@/lib/env';
import { PLAN_BY_AMOUNT_CENTS, CREDITS_BY_PLAN } from '@/lib/pricing';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY manquante');
  }
  // Version d'API laissée à celle épinglée par le SDK installé.
  cached ??= new Stripe(env.stripeSecretKey);
  return cached;
}

export interface MappedPlan {
  plan: 'pack' | 'pass';
  credits: number;
}

/**
 * Correspondance vers l'offre.
 * L'identifiant de prix est utilisé quand il est configuré ; sinon on retombe
 * sur le montant facturé — seul repère fiable avec des liens de paiement
 * Stripe, dont on ne connaît pas les `price_...` à l'avance.
 */
export function planForPrice(
  priceId: string | null | undefined,
  amountCents?: number | null,
): MappedPlan | null {
  // Le nombre de coupes vient des offres, jamais recopié ici : recopié, il
  // finirait par diverger de ce que la page annonce.
  if (priceId && priceId === env.stripePricePack) {
    return { plan: 'pack', credits: CREDITS_BY_PLAN.pack };
  }
  if (priceId && priceId === env.stripePricePass) {
    return { plan: 'pass', credits: CREDITS_BY_PLAN.pass };
  }

  if (typeof amountCents === 'number') {
    const byAmount = PLAN_BY_AMOUNT_CENTS[amountCents];
    if (byAmount) return byAmount;
  }
  return null;
}
