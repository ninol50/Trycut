export type PlanId = 'free' | 'pack' | 'pass' | 'trimestre';
/** Offres payantes, telles qu'elles existent dans l'énumération `plan_tier`. */
export type PaidPlanId = Exclude<PlanId, 'free'>;

export interface PricingPlan {
  /** Seules les offres payantes figurent dans la grille. */
  id: PaidPlanId;
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
  /** Lien de paiement. Absent tant que l'offre n'a pas le sien. */
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
  'https://whop.com/checkout/plan_vYAxBgf8Db98T';
const LINK_CONFORT =
  process.env.NEXT_PUBLIC_STRIPE_LINK_CONFORT ||
  'https://whop.com/checkout/plan_y8tglSLopO5Ws';
/** Offre annuelle : un paiement unique de 64 €, chez Whop comme les deux autres. */
const LIEN_ANNUEL =
  process.env.NEXT_PUBLIC_STRIPE_LINK_INTENSIF ||
  'https://whop.com/checkout/plan_yKHEvw3cvR9KA';

/**
 * Deux abonnements mensuels et une offre annuelle, du plus léger au plus
 * intensif.
 *
 * L'offre à 0 € a été retirée : une carte « Découverte » qui n'inclut aucune
 * coupe occupait le haut de la grille pour annoncer qu'elle ne sert à rien.
 * Créer un compte reste gratuit, et se fait au moment du rendu ; ce n'est pas
 * une offre, donc ça n'a pas à figurer parmi les offres. `free` reste une
 * valeur de `plan_tier` en base : c'est l'état d'un compte, pas un produit.
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
 *
 * Les listes s'allongent avec le prix, et chaque ligne est vérifiable. Le seul
 * palier de fonctionnalité qui existe réellement est le catalogue : cinq
 * styles — une couleur et quatre accessoires — sont marqués `is_premium` et
 * restent fermés à l'Essentiel. Le reste du ladder tient au nombre de coupes
 * et au prix unitaire. Aucune ligne n'est répétée sur une seule offre pour la
 * faire paraître plus riche : ce qui est vrai pour les trois est écrit sur les
 * trois, sinon le client qui compare se sent floué, et il a raison.
 */
export const PRICING: readonly PricingPlan[] = [
  {
    id: 'pack',
    name: 'Essentiel',
    cta: 'Prendre l’essentiel',
    price: '9 €',
    period: '/mois',
    credits: 17,
    creditsPeriod: 'par mois',
    highlighted: false,
    features: [
      '17 coupes par mois',
      '38 styles : coupes, barbes, couleurs, accessoires',
      'Rendu HD, sans filigrane',
      'Toutes les textures : lisses, bouclés, crépus',
      'Sans engagement, résiliable à tout moment',
    ],
    paymentLink: LINK_ESSENTIEL,
  },
  {
    id: 'pass',
    name: 'Confort',
    cta: 'Prendre le confort',
    price: '17 €',
    period: '/mois',
    credits: 30,
    creditsPeriod: 'par mois',
    highlighted: false,
    features: [
      '30 coupes par mois',
      'Les 43 styles, exclusifs compris',
      'Couleurs et accessoires réservés aux abonnés Confort et Intensif',
      'Rendu HD, sans filigrane',
      'Toutes les textures : lisses, bouclés, crépus',
      'Sans engagement, résiliable à tout moment',
    ],
    paymentLink: LINK_CONFORT,
  },
  {
    id: 'trimestre',
    name: 'Intensif',
    cta: 'Prendre l’année',
    price: '64 €',
    period: '/an',
    credits: 500,
    creditsPeriod: 'par an',
    highlighted: true,
    features: [
      '500 coupes pour l’année',
      'Un seul paiement pour l’année, rien à renouveler',
      '0,13 € la coupe : le meilleur prix des trois offres',
      'Les 43 styles, exclusifs compris',
      'Couleurs et accessoires réservés aux abonnés Confort et Intensif',
      'Rendu HD, sans filigrane',
      'Toutes les textures : lisses, bouclés, crépus',
    ],
    paymentLink: LIEN_ANNUEL || undefined,
  },
] as const;

export const CREDITS_BY_PLAN: Record<PlanId, number> = {
  free: 0,
  pack: 17,
  pass: 30,
  trimestre: 500,
};

/**
 * Identifiants des plans Whop, extraits des liens de paiement.
 *
 * C'est par là que le webhook reconnaît l'offre, avant de retomber sur le
 * montant : un produit à 9,00 € vendu là où le site affiche 8,90 € encaisserait
 * sans rien créditer si seul le montant comptait. L'identifiant, lui, ne bouge
 * pas quand le prix change.
 */
export const WHOP_PLAN_IDS: Record<PaidPlanId, string> = {
  pack: 'plan_vYAxBgf8Db98T',
  pass: 'plan_y8tglSLopO5Ws',
  trimestre: 'plan_yKHEvw3cvR9KA',
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
  900: { plan: 'pack', credits: 17 },
  1700: { plan: 'pass', credits: 30 },
  6400: { plan: 'trimestre', credits: 500 },
  // Anciens montants Stripe, gardés pour les paiements en cours de route : un
  // client débité à 8,90 € doit être crédité même après le passage à 9 €.
  890: { plan: 'pack', credits: 17 },
  1790: { plan: 'pass', credits: 30 },
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
    // Whop ne renvoie au webhook que ce qui passe par `metadata`. Sans cette
    // seconde écriture, le rattachement retomberait sur l'email, et un client
    // qui paie avec une autre adresse que celle de son compte ne serait jamais
    // crédité automatiquement.
    if (url.hostname.endsWith('whop.com')) {
      url.searchParams.set('metadata[client_reference_id]', userId);
    }
    if (email) url.searchParams.set('prefilled_email', email);
    return url.toString();
  } catch {
    // Lien mal formé : mieux vaut un rattachement manuel qu'un bouton mort.
    return link;
  }
}
