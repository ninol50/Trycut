/**
 * Description des offres — sans dépendance au SDK Stripe.
 *
 * Ce fichier est importé par des composants client (`PricingTable`, la landing).
 * Le garder séparé de `lib/stripe.ts` évite d'embarquer tout le SDK Stripe
 * dans le bundle navigateur pour trois libellés de prix.
 */

export type OfferId = 'free' | 'pack' | 'pass';

export interface Offer {
  id: OfferId;
  name: string;
  price: string;
  cadence: string;
  credits: number;
  /** Mise en avant : le pack est l'offre principale, pas l'abonnement. */
  highlighted: boolean;
  mode: 'payment' | 'subscription' | null;
  features: string[];
  footnote?: string;
}

export const PACK_CREDITS = 15;
export const PASS_MONTHLY_CREDITS = 60;

export const OFFERS: readonly Offer[] = [
  {
    id: 'free',
    name: 'Essai',
    price: '0 €',
    cadence: '',
    credits: 1,
    highlighted: false,
    mode: null,
    features: [
      '1 essai après vérification de ton email',
      'Basse résolution',
      'Filigrane sur le résultat',
    ],
  },
  {
    id: 'pack',
    name: 'Pack',
    price: '4,99 €',
    cadence: 'paiement unique',
    credits: PACK_CREDITS,
    highlighted: true,
    mode: 'payment',
    features: [
      '15 essais',
      'HD sans filigrane',
      'Valables 6 mois',
      'Tout le catalogue standard',
    ],
    footnote: 'Tu paies une fois. Pas d’abonnement, rien à résilier.',
  },
  {
    id: 'pass',
    name: 'Pass mensuel',
    price: '9,99 €',
    cadence: 'par mois',
    credits: PASS_MONTHLY_CREDITS,
    highlighted: false,
    mode: 'subscription',
    features: [
      '60 essais par mois',
      'HD sans filigrane',
      'Catalogue premium',
      'File prioritaire',
    ],
    footnote: 'Les essais non utilisés ne sont pas reportés au mois suivant.',
  },
];
