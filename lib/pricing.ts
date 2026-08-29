export type PlanId = 'free' | 'pack' | 'pass';

export interface PricingPlan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  /** Coupes incluses par mois. */
  credits: number;
  highlighted: boolean;
  features: readonly string[];
  /** Lien de paiement Stripe. Absent sur l'offre gratuite. */
  paymentLink?: string;
}

/**
 * Liens de paiement Stripe. Publics par nature (ils sont dans le HTML),
 * surchargeables par variable d'environnement pour passer en test.
 * `||` et non `??` : une variable définie mais vide doit retomber sur le défaut.
 */
const PAYMENT_LINK_PACK =
  process.env.NEXT_PUBLIC_STRIPE_LINK_PACK || 'https://buy.stripe.com/3cIaEWgRT65x5ye2sU2wU06';
const PAYMENT_LINK_PASS =
  process.env.NEXT_PUBLIC_STRIPE_LINK_PASS || 'https://buy.stripe.com/28EcN40SV51tgcSaZq2wU07';

export const PRICING: readonly PricingPlan[] = [
  {
    id: 'free',
    name: 'Découverte',
    price: '0 €',
    period: '',
    credits: 0,
    highlighted: false,
    features: ['Compte créé, prêt à s’abonner', 'Aucune coupe incluse'],
  },
  {
    id: 'pack',
    name: 'Pack',
    price: '9,99 €',
    period: '/mois',
    credits: 15,
    highlighted: true,
    features: ['HD sans filigrane', 'Historique conservé', 'Résiliable à tout moment'],
    paymentLink: PAYMENT_LINK_PACK,
  },
  {
    id: 'pass',
    name: 'Pass',
    price: '17,90 €',
    period: '/mois',
    credits: 50,
    highlighted: false,
    features: ['HD sans filigrane', 'Catalogue premium', 'File prioritaire'],
    paymentLink: PAYMENT_LINK_PASS,
  },
] as const;

export const CREDITS_BY_PLAN: Record<PlanId, number> = { free: 0, pack: 15, pass: 50 };

/**
 * Montants Stripe en centimes → offre. Les liens de paiement ne nous
 * transmettent pas d'identifiant de prix connu à l'avance : on retombe
 * sur le montant facturé, qui lui est fiable.
 */
export const PLAN_BY_AMOUNT_CENTS: Record<number, { plan: 'pack' | 'pass'; credits: number }> = {
  999: { plan: 'pack', credits: 15 },
  1790: { plan: 'pass', credits: 50 },
};

/**
 * Rattache un lien de paiement Stripe au compte qui clique.
 *
 * Sans `client_reference_id`, le webhook n'a aucun moyen de savoir à qui
 * attribuer les coupes : les métadonnées sont vides sur un lien de paiement,
 * et le client Stripe n'existe pas encore au premier achat. Le paiement
 * passerait sans jamais créditer.
 */
export function withCheckoutReference(
  link: string,
  userId: string,
  email?: string | null,
): string {
  try {
    const url = new URL(link);
    url.searchParams.set('client_reference_id', userId);
    if (email) url.searchParams.set('prefilled_email', email);
    return url.toString();
  } catch {
    // Lien mal formé : mieux vaut un paiement à rattacher à la main qu'un
    // bouton mort.
    return link;
  }
}
