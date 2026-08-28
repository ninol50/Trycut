import Stripe from 'stripe';
import { requireEnv } from '@/lib/env';
import type { OfferId } from '@/lib/offers';

let cached: Stripe | null = null;

/** SDK Stripe — serveur uniquement. Les libellés d'offre vivent dans `lib/offers.ts`. */
export function getStripe(): Stripe {
  if (cached) return cached;
  cached = new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
    apiVersion: '2026-07-29.dahlia',
    typescript: true,
  });
  return cached;
}

export function priceIdFor(offer: Exclude<OfferId, 'free'>): string {
  return offer === 'pack' ? requireEnv('STRIPE_PRICE_PACK') : requireEnv('STRIPE_PRICE_PASS');
}

export { OFFERS, PACK_CREDITS, PASS_MONTHLY_CREDITS } from '@/lib/offers';
export type { Offer, OfferId } from '@/lib/offers';
