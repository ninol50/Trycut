export type PlanId = 'free' | 'pack' | 'pass';

export interface PricingPlan {
  id: PlanId;
  name: string;
  price: string;
  /** Prix barré, affiché avant le prix courant. Absent s'il n'y a pas de remise. */
  strikePrice?: string;
  period: string;
  /** Coupes incluses par période de facturation. */
  credits: number;
  /** Libellé de la période pour les coupes : « par semaine », « par mois ». */
  creditsPeriod: string;
  highlighted: boolean;
  features: readonly string[];
  /** Lien de paiement Stripe. Absent sur l'offre gratuite. */
  paymentLink?: string;
}

/**
 * Liens de paiement Stripe, à créer pour les deux offres actuelles :
 * 7,99 € et 9,99 € par mois. Publics par nature — ils sont dans le
 * HTML — et posés par variable d'environnement.
 *
 * `||` et non `??` : Vercel définit les variables même vides, et une valeur
 * vide doit retomber sur le défaut plutôt que de produire un bouton mort.
 */
const LINK_ESSENTIEL = process.env.NEXT_PUBLIC_STRIPE_LINK_ESSENTIEL || '';
const LINK_COMPLET = process.env.NEXT_PUBLIC_STRIPE_LINK_COMPLET || '';

/**
 * Identifiants d'offre Whop, conservés : le jour où le volume justifiera de
 * repasser chez eux, le rattachement se fera par là.
 */
export const WHOP_PLAN_IDS: Record<'pack' | 'pass', string> = {
  pack: 'plan_TgQeVRautIvVk',
  pass: 'plan_FqNwkkzr18mMH',
};

/**
 * Deux offres mensuelles, et la seconde est la meilleure affaire : deux euros
 * de plus donnent dix coupes de plus. Un écart trop grand rendrait la première
 * inutile, un écart trop faible rendrait la seconde sans intérêt.
 *
 * Les identifiants 'pack' et 'pass' sont conservés : ce sont les valeurs de
 * l'énumération `plan_tier` en base, et tout le contrôle d'accès s'appuie
 * dessus. Les renommer imposerait une migration d'énumération pour un gain
 * purement cosmétique.
 */
export const PRICING: readonly PricingPlan[] = [
  {
    id: 'free',
    name: 'Découverte',
    price: '0 €',
    period: '',
    credits: 0,
    creditsPeriod: '',
    highlighted: false,
    features: ['Compte créé, prêt à s’abonner', 'Aucune coupe incluse'],
  },
  {
    id: 'pack',
    name: 'Essentiel',
    price: '7,99 €',
    period: '/mois',
    credits: 15,
    creditsPeriod: 'par mois',
    highlighted: false,
    features: ['15 coupes par mois', 'HD sans filigrane', 'Historique conservé'],
    paymentLink: LINK_ESSENTIEL,
  },
  {
    id: 'pass',
    name: 'Complet',
    price: '9,99 €',
    period: '/mois',
    credits: 25,
    creditsPeriod: 'par mois',
    highlighted: true,
    features: [
      '25 coupes par mois',
      'HD sans filigrane',
      'Historique conservé',
      'Le meilleur rapport qualité-prix',
    ],
    paymentLink: LINK_COMPLET,
  },
] as const;

export const CREDITS_BY_PLAN: Record<PlanId, number> = { free: 0, pack: 15, pass: 25 };

/**
 * Montant encaissé en centimes → offre.
 *
 * Le webhook n'a pas d'identifiant de prix connu d'avance : le montant
 * facturé, lui, est fiable. Une offre inconnue ne crédite rien plutôt que de
 * créditer au hasard.
 */
export const PLAN_BY_AMOUNT_CENTS: Record<number, { plan: 'pack' | 'pass'; credits: number }> = {
  799: { plan: 'pack', credits: 15 },
  999: { plan: 'pass', credits: 25 },
};

/**
 * Rattache le lien de paiement au compte qui clique.
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
    // Lien mal formé : mieux vaut un rattachement manuel qu'un bouton mort.
    return link;
  }
}
