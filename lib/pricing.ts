export type PlanId = 'free' | 'pack' | 'pass';

export interface PricingPlan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  credits: number;
  highlighted: boolean;
  features: readonly string[];
}

/** Prix définitifs (section 10). Ne pas modifier. */
export const PRICING: readonly PricingPlan[] = [
  {
    id: 'free',
    name: 'Essai',
    price: '0 €',
    period: '',
    credits: 1,
    highlighted: false,
    features: [
      '1 essai offert sans compte',
      '1 crédit après vérification de l’email',
      'Basse résolution, filigrane',
    ],
  },
  {
    id: 'pack',
    name: 'Pack',
    price: '9,90 €',
    period: '/mois',
    credits: 15,
    highlighted: true,
    features: ['15 essais par mois', 'HD sans filigrane', 'Historique conservé'],
  },
  {
    id: 'pass',
    name: 'Pass',
    price: '19,99 €',
    period: '/mois',
    credits: 80,
    highlighted: false,
    features: ['80 essais par mois', 'HD sans filigrane', 'Catalogue premium', 'File prioritaire'],
  },
] as const;

export const ONE_TIME_PACK = {
  name: 'Pack 15 essais',
  price: '9,90 €',
  credits: 15,
  validity: 'valables 6 mois',
} as const;

export const CREDITS_BY_PLAN: Record<PlanId, number> = { free: 1, pack: 15, pass: 80 };
