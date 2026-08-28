import Stripe from 'stripe';
import { env } from '@/lib/env';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY manquante');
  }
  // Version d'API laissée à celle épinglée par le SDK installé.
  cached ??= new Stripe(env.stripeSecretKey);
  return cached;
}

/** Correspondance prix Stripe → plan et crédits accordés. */
export function planForPrice(priceId: string | null | undefined):
  | { plan: 'pack' | 'pass'; credits: number; mode: 'subscription' }
  | { plan: 'pack'; credits: number; mode: 'payment' }
  | null {
  if (!priceId) return null;
  if (priceId === env.stripePricePack) return { plan: 'pack', credits: 15, mode: 'subscription' };
  if (priceId === env.stripePricePass) return { plan: 'pass', credits: 80, mode: 'subscription' };
  if (priceId === env.stripePricePackOneshot) return { plan: 'pack', credits: 15, mode: 'payment' };
  return null;
}
