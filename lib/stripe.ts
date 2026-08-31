import Stripe from 'stripe';
import { CREDITS_BY_PLAN, PLAN_BY_AMOUNT_CENTS, type PaidPlanId } from '@/lib/pricing';
import type { StripeConfig } from '@/lib/stripe-config';

const clients = new Map<string, Stripe>();

/**
 * Client Stripe pour une clé donnée.
 *
 * La clé n'est plus lue depuis l'environnement : elle peut venir de la base,
 * posée depuis la page admin. Un client par clé, gardé en mémoire — en
 * recréer un à chaque requête rouvrirait une connexion à chaque paiement.
 */
export function stripeWith(secretKey: string): Stripe {
  const existant = clients.get(secretKey);
  if (existant) return existant;

  // Version d'API laissée à celle épinglée par le SDK installé.
  const client = new Stripe(secretKey);
  clients.set(secretKey, client);
  return client;
}

export interface MappedPlan {
  plan: PaidPlanId;
  credits: number;
}

/**
 * Correspondance vers l'offre.
 * L'identifiant de prix est utilisé quand il est connu ; sinon on retombe sur
 * le montant facturé — seul repère fiable avec un lien de paiement, dont on
 * ne connaît pas le `price_...` à l'avance.
 */
export function planForPrice(
  priceId: string | null | undefined,
  amountCents?: number | null,
  config?: StripeConfig,
): MappedPlan | null {
  // Le nombre de coupes vient des offres, jamais recopié ici : recopié, il
  // finirait par diverger de ce que la page annonce.
  if (priceId && config?.pricePack && priceId === config.pricePack) {
    return { plan: 'pack', credits: CREDITS_BY_PLAN.pack };
  }
  if (priceId && config?.pricePass && priceId === config.pricePass) {
    return { plan: 'pass', credits: CREDITS_BY_PLAN.pass };
  }
  if (priceId && config?.priceTrimestre && priceId === config.priceTrimestre) {
    return { plan: 'trimestre', credits: CREDITS_BY_PLAN.trimestre };
  }

  if (typeof amountCents === 'number') {
    const byAmount = PLAN_BY_AMOUNT_CENTS[amountCents];
    if (byAmount) return byAmount;
  }
  return null;
}
