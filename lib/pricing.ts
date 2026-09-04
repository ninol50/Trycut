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
 * Liens de paiement Stripe, aux montants de septembre 2026 : 8,90 €, 17,90 €
 * et 34,90 € par mois, dans cet ordre.
 *
 * Écrits ici plutôt que posés en variable : un lien de paiement est public par
 * nature — il figure en clair dans le HTML de la page tarifs — donc rien ne
 * justifie de le cacher, et une variable en moins est une panne en moins.
 *
 * Attention en cas de changement de tarif : c'est le montant encaissé qui
 * décide des coupes créditées (`PLAN_BY_AMOUNT_CENTS`). Un lien dont le
 * montant ne figure pas dans cette table encaisse sans rien créditer. Changer
 * un prix, c'est donc changer trois choses ensemble : le lien, l'affichage et
 * la table des montants.
 *
 * `||` et non `??` : une variable définie mais vide doit retomber sur le
 * défaut plutôt que produire un bouton mort.
 */
const LINK_ESSENTIEL =
  process.env.NEXT_PUBLIC_STRIPE_LINK_ESSENTIEL ||
  'https://buy.stripe.com/8x214m4571PhbWC2sU2wU0d';
const LINK_CONFORT =
  process.env.NEXT_PUBLIC_STRIPE_LINK_CONFORT ||
  'https://buy.stripe.com/cNi14m1WZ0Ld2m2aZq2wU0c';
const LINK_INTENSIF =
  process.env.NEXT_PUBLIC_STRIPE_LINK_INTENSIF ||
  'https://buy.stripe.com/aFa28q9prgKbf8O7Ne2wU0e';

/**
 * Trois abonnements mensuels, du plus léger au plus intensif.
 *
 * Prix à la coupe : 0,52 € · 0,60 € · 0,35 €. L'offre du milieu revient donc
 * plus cher à la coupe que la première — c'est un choix du propriétaire,
 * signalé mais appliqué tel quel. Seule la troisième est mise en avant, parce
 * qu'elle est réellement la meilleure affaire.
 *
 * Les identifiants 'pack', 'pass' et 'trimestre' sont les valeurs de
 * l'énumération `plan_tier` en base, sur lesquelles s'appuie tout le contrôle
 * d'accès. Ils ne décrivent plus la durée — les trois offres sont mensuelles —
 * mais les renommer imposerait une migration d'énumération pour un gain
 * purement cosmétique.
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
    name: 'Essentiel',
    cta: 'Prendre l’essentiel',
    price: '8,90 €',
    period: '/mois',
    credits: 17,
    creditsPeriod: 'par mois',
    highlighted: false,
    features: ['17 coupes par mois', 'HD sans filigrane', 'Sans engagement'],
    paymentLink: LINK_ESSENTIEL,
  },
  {
    id: 'pass',
    name: 'Confort',
    cta: 'Prendre le confort',
    price: '17,90 €',
    period: '/mois',
    credits: 30,
    creditsPeriod: 'par mois',
    highlighted: false,
    features: [
      '30 coupes par mois',
      'HD sans filigrane',
      'Catalogue complet',
      'Historique conservé',
    ],
    paymentLink: LINK_CONFORT,
  },
  {
    id: 'trimestre',
    name: 'Intensif',
    cta: 'Prendre l’intensif',
    price: '34,90 €',
    period: '/mois',
    credits: 100,
    creditsPeriod: 'par mois',
    highlighted: true,
    features: [
      '100 coupes par mois',
      'HD sans filigrane',
      'Catalogue complet',
      'Historique conservé',
      'Le meilleur prix à la coupe',
    ],
    paymentLink: LINK_INTENSIF,
  },
] as const;

export const CREDITS_BY_PLAN: Record<PlanId, number> = {
  free: 0,
  pack: 17,
  pass: 30,
  trimestre: 100,
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
  pack: 'Essentiel',
  pass: 'Confort',
  trimestre: 'Intensif',
};

/**
 * Montant encaissé en centimes → offre.
 *
 * Le webhook n'a pas d'identifiant de prix connu d'avance quand le paiement
 * passe par un lien : le montant facturé, lui, est fiable. Une offre inconnue
 * ne crédite rien plutôt que de créditer au hasard.
 */
export const PLAN_BY_AMOUNT_CENTS: Record<number, { plan: PaidPlanId; credits: number }> = {
  890: { plan: 'pack', credits: 17 },
  1790: { plan: 'pass', credits: 30 },
  3490: { plan: 'trimestre', credits: 100 },
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
