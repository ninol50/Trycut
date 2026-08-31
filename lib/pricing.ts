export type PlanId = 'free' | 'pack' | 'pass' | 'trimestre';
/** Offres payantes, telles qu'elles existent dans l'énumération `plan_tier`. */
export type PaidPlanId = Exclude<PlanId, 'free'>;

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
  /** Texte du bouton. Le genre change d'une offre à l'autre. */
  cta: string;
  /** Lien de paiement Stripe. Absent sur l'offre gratuite. */
  paymentLink?: string;
}

/**
 * Liens de paiement Stripe.
 *
 * Ils sont écrits ici et non posés par variable d'environnement : un lien de
 * paiement est public par nature — il figure en clair dans le HTML de la page
 * tarifs — donc rien ne justifie de le cacher, et une variable en moins est
 * une panne en moins. Les variables restent prioritaires quand elles existent,
 * pour pouvoir changer un lien sans toucher au code.
 *
 * `||` et non `??` : une variable définie mais vide doit retomber sur le
 * défaut plutôt que produire un bouton mort.
 */
const LINK_SEMAINE =
  process.env.NEXT_PUBLIC_STRIPE_LINK_SEMAINE || 'https://buy.stripe.com/fZubJ07hjfG71hY3wY2wU08';
const LINK_MOIS =
  process.env.NEXT_PUBLIC_STRIPE_LINK_MOIS || 'https://buy.stripe.com/4gM3cucBD2Tl8Kq4B22wU09';
const LINK_TRIMESTRE =
  process.env.NEXT_PUBLIC_STRIPE_LINK_TRIMESTRE || 'https://buy.stripe.com/aFa8wOgRT51t6Ci3wY2wU0a';

/**
 * Trois rythmes d'abonnement. Le prix par coupe baisse avec l'engagement :
 * 0,80 € à la semaine, 0,60 € au mois, 0,37 € au trimestre. C'est ce qui
 * justifie les trois offres — sans écart, la plus courte gagnerait toujours.
 *
 * Les identifiants 'pack' et 'pass' sont conservés pour la semaine et le mois :
 * ce sont les valeurs de l'énumération `plan_tier` en base, et tout le contrôle
 * d'accès s'appuie dessus. Les renommer imposerait une migration d'énumération
 * pour un gain purement cosmétique.
 */
export const PRICING: readonly PricingPlan[] = [
  {
    id: 'free',
    name: 'Découverte',
    cta: 'Créer mon compte',
    price: '0 €',
    period: '',
    credits: 0,
    creditsPeriod: '',
    highlighted: false,
    features: ['Compte créé, prêt à s’abonner', 'Aucune coupe incluse'],
  },
  {
    id: 'pack',
    name: 'Semaine',
    cta: 'Prendre la semaine',
    price: '3,99 €',
    period: '/semaine',
    credits: 5,
    creditsPeriod: 'par semaine',
    highlighted: false,
    features: ['5 coupes par semaine', 'HD sans filigrane', 'Sans engagement'],
    paymentLink: LINK_SEMAINE,
  },
  {
    id: 'pass',
    name: 'Mois',
    cta: 'Prendre le mois',
    price: '11,99 €',
    period: '/mois',
    credits: 20,
    creditsPeriod: 'par mois',
    highlighted: false,
    features: [
      '20 coupes par mois',
      'HD sans filigrane',
      'Catalogue complet',
      'Historique conservé',
    ],
    paymentLink: LINK_MOIS,
  },
  {
    id: 'trimestre',
    name: 'Trimestre',
    cta: 'Prendre le trimestre',
    price: '22 €',
    period: '/3 mois',
    credits: 60,
    creditsPeriod: 'par trimestre',
    highlighted: true,
    features: [
      '60 coupes sur trois mois',
      'HD sans filigrane',
      'Catalogue complet',
      'Historique conservé',
      'Le meilleur prix à la coupe',
    ],
    paymentLink: LINK_TRIMESTRE,
  },
] as const;

export const CREDITS_BY_PLAN: Record<PlanId, number> = {
  free: 0,
  pack: 5,
  pass: 20,
  trimestre: 60,
};

/**
 * Identifiants d'offre Whop, conservés en sommeil : le jour où le volume
 * justifiera d'y repasser, le rattachement se fera par là. Ils ne couvrent que
 * les deux offres qui existaient chez eux.
 */
export const WHOP_PLAN_IDS: Record<'pack' | 'pass', string> = {
  pack: 'plan_TgQeVRautIvVk',
  pass: 'plan_FqNwkkzr18mMH',
};

/** Libellé lisible d'une offre, pour les emails et les journaux. */
export const PLAN_LABELS: Record<PaidPlanId, string> = {
  pack: 'abonnement à la semaine',
  pass: 'abonnement au mois',
  trimestre: 'abonnement au trimestre',
};

/**
 * Montant encaissé en centimes → offre.
 *
 * Le webhook n'a pas d'identifiant de prix connu d'avance quand le paiement
 * passe par un lien : le montant facturé, lui, est fiable. Une offre inconnue
 * ne crédite rien plutôt que de créditer au hasard.
 */
export const PLAN_BY_AMOUNT_CENTS: Record<number, { plan: PaidPlanId; credits: number }> = {
  399: { plan: 'pack', credits: 5 },
  1199: { plan: 'pass', credits: 20 },
  2200: { plan: 'trimestre', credits: 60 },
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
