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
  /** Page de paiement Whop. Absente sur l'offre gratuite. */
  paymentLink?: string;
}

/**
 * Pages de paiement Whop. Publiques par nature — elles sont dans le HTML —
 * et surchargeables par variable d'environnement pour tester une autre offre.
 * `||` et non `??` : Vercel définit les variables même vides, une valeur vide
 * doit retomber sur le défaut.
 */
const LINK_HEBDO =
  process.env.NEXT_PUBLIC_WHOP_LINK_HEBDO || 'https://whop.com/checkout/plan_TgQeVRautIvVk';
const LINK_MENSUEL =
  process.env.NEXT_PUBLIC_WHOP_LINK_MENSUEL || 'https://whop.com/checkout/plan_FqNwkkzr18mMH';

/**
 * Identifiants d'offre Whop, lisibles dans les liens de paiement ci-dessus.
 *
 * C'est le rattachement le plus sûr : le webhook porte cet identifiant, alors
 * que le montant dépend de la devise et de l'unité choisies par Whop. On s'en
 * sert d'abord, le montant ne servant que de repli.
 */
export const WHOP_PLAN_IDS: Record<'pack' | 'pass', string> = {
  pack: 'plan_TgQeVRautIvVk',
  pass: 'plan_FqNwkkzr18mMH',
};

/**
 * Deux offres, et la mensuelle est volontairement la meilleure affaire :
 * 3 €/semaine revient à environ 13 € par mois pour 21 coupes, contre 10 € pour
 * 23 coupes. L'hebdomadaire sert de point d'entrée, pas de bonne affaire.
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
    name: 'Semaine',
    price: '3 €',
    period: '/semaine',
    credits: 5,
    creditsPeriod: 'par semaine',
    highlighted: false,
    features: ['5 coupes par semaine', 'HD sans filigrane', 'Historique conservé'],
    paymentLink: LINK_HEBDO,
  },
  {
    id: 'pass',
    name: 'Mois',
    price: '10 €',
    strikePrice: '12 €',
    period: '/mois',
    credits: 23,
    creditsPeriod: 'par mois',
    highlighted: true,
    features: [
      '23 coupes par mois',
      'HD sans filigrane',
      'Historique conservé',
      'Le meilleur rapport qualité-prix',
    ],
    paymentLink: LINK_MENSUEL,
  },
] as const;

export const CREDITS_BY_PLAN: Record<PlanId, number> = { free: 0, pack: 5, pass: 23 };

/**
 * Montant encaissé en centimes → offre.
 *
 * Le webhook n'a pas d'identifiant de prix connu d'avance : le montant
 * facturé, lui, est fiable. Une offre inconnue ne crédite rien plutôt que de
 * créditer au hasard.
 */
export const PLAN_BY_AMOUNT_CENTS: Record<number, { plan: 'pack' | 'pass'; credits: number }> = {
  300: { plan: 'pack', credits: 5 },
  1000: { plan: 'pass', credits: 23 },
};

/**
 * Rattache la page de paiement au compte qui clique.
 *
 * Whop ne transmet des métadonnées que sur une session créée par son API ;
 * sur un lien d'offre simple, il ne reste que l'email de l'acheteur pour
 * retrouver le compte. On pré-remplit donc l'email et on le redit à l'écran :
 * payer avec une autre adresse que celle du compte est la seule façon de ne
 * pas être crédité.
 */
export function withCheckoutReference(
  link: string,
  userId: string,
  email?: string | null,
): string {
  try {
    const url = new URL(link);
    if (email) url.searchParams.set('email', email);
    // Repère de secours, lisible dans le tableau de bord Whop si un paiement
    // doit être rattaché à la main.
    url.searchParams.set('ref', userId);
    return url.toString();
  } catch {
    // Lien mal formé : mieux vaut un rattachement manuel qu'un bouton mort.
    return link;
  }
}
