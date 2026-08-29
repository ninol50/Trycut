/**
 * Modèle du questionnaire (section 5).
 * Les réponses vivent en localStorage sous `onboarding_v1` tant qu'il n'y a pas de compte.
 */

export const ONBOARDING_STORAGE_KEY = 'onboarding_v1';

export type OnboardingStepId =
  | 'goal'
  | 'length'
  | 'texture'
  | 'hairline'
  | 'face'
  | 'transition_1'
  | 'style'
  | 'beard'
  | 'accessories'
  | 'transition_2'
  | 'boldness'
  | 'first_name'
  | 'summary';

export interface Choice {
  value: string;
  label: string;
}

export type OnboardingStep =
  | {
      id: OnboardingStepId;
      kind: 'single' | 'multi';
      question: string;
      hint?: string;
      choices: Choice[];
    }
  | { id: OnboardingStepId; kind: 'transition'; question: string; hint?: string }
  | { id: OnboardingStepId; kind: 'text'; question: string; hint?: string; placeholder: string }
  | { id: OnboardingStepId; kind: 'summary'; question: string };

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: 'goal',
    kind: 'single',
    question: 'Ton objectif',
    choices: [
      { value: 'coupe', label: 'Changer de coupe' },
      { value: 'couleur', label: 'Tester une couleur' },
      { value: 'accessoires', label: 'Essayer des accessoires' },
      { value: 'curiosite', label: 'Juste voir ce que ça donne' },
    ],
  },
  {
    id: 'length',
    kind: 'single',
    question: 'Ta longueur actuelle',
    choices: [
      { value: 'rase', label: 'Rasé' },
      { value: 'court', label: 'Court' },
      { value: 'mi-long', label: 'Mi-long' },
      { value: 'long', label: 'Long' },
    ],
  },
  {
    id: 'texture',
    kind: 'single',
    question: 'Ta texture',
    choices: [
      { value: 'raides', label: 'Raides' },
      { value: 'ondules', label: 'Ondulés' },
      { value: 'boucles', label: 'Bouclés' },
      { value: 'crepus', label: 'Crépus' },
    ],
  },
  {
    id: 'hairline',
    kind: 'single',
    question: 'Ligne de cheveux',
    choices: [
      { value: 'pleine', label: 'Pleine' },
      { value: 'legerement-degarnie', label: 'Légèrement dégarnie' },
      { value: 'degarnie', label: 'Dégarnie' },
      { value: 'non-precise', label: 'Je préfère ne pas dire' },
    ],
  },
  {
    id: 'face',
    kind: 'single',
    question: 'Forme du visage',
    hint: 'Si tu ne sais pas, on l’estime à partir de ta photo.',
    choices: [
      { value: 'ovale', label: 'Ovale' },
      { value: 'rond', label: 'Rond' },
      { value: 'carre', label: 'Carré' },
      { value: 'allonge', label: 'Allongé' },
      { value: 'inconnu', label: 'Je ne sais pas' },
    ],
  },
  {
    id: 'transition_1',
    kind: 'transition',
    question: '7 hommes sur 10 repoussent un changement de coupe par peur du résultat.',
    hint: 'Tu vas voir le tien avant de t’asseoir dans le fauteuil.',
  },
  {
    id: 'style',
    kind: 'single',
    question: 'Ton style',
    choices: [
      { value: 'classique', label: 'Classique' },
      { value: 'streetwear', label: 'Streetwear' },
      { value: 'sportif', label: 'Sportif' },
      { value: 'soigne', label: 'Soigné' },
    ],
  },
  {
    id: 'beard',
    kind: 'single',
    question: 'Barbe',
    choices: [
      { value: 'rase', label: 'Rasé de près' },
      { value: 'trois-jours', label: 'Barbe de 3 jours' },
      { value: 'fournie', label: 'Barbe fournie' },
      { value: 'a-tester', label: 'Je veux tester' },
    ],
  },
  {
    id: 'accessories',
    kind: 'multi',
    question: 'Accessoires qui t’intéressent',
    hint: 'Plusieurs choix possibles.',
    choices: [
      { value: 'chaines', label: 'Chaînes' },
      { value: 'boucles', label: 'Boucles d’oreilles' },
      { value: 'grillz', label: 'Grillz' },
      { value: 'aucun', label: 'Aucun' },
    ],
  },
  {
    id: 'transition_2',
    kind: 'transition',
    question: 'On sélectionne les coupes adaptées à ta texture et à ton visage.',
  },
  {
    id: 'boldness',
    kind: 'single',
    question: 'Ton niveau d’audace',
    choices: [
      { value: 'discret', label: 'Discret' },
      { value: 'modere', label: 'Modéré' },
      { value: 'remarque', label: 'Je veux qu’on remarque' },
    ],
  },
  {
    id: 'first_name',
    kind: 'text',
    question: 'Ton prénom',
    hint: 'On personnalise la suite avec.',
    placeholder: 'Prénom',
  },
  { id: 'summary', kind: 'summary', question: 'Voici ton profil' },
] as const;

/** En mode `short`, seuls les écrans 2, 3, 5 et 12 sont servis (+ le récap). */
const SHORT_STEP_IDS: readonly OnboardingStepId[] = [
  'length',
  'texture',
  'face',
  'first_name',
  'summary',
];

export type OnboardingVariant = 'none' | 'short' | 'full';

export function getSteps(variant: OnboardingVariant): readonly OnboardingStep[] {
  if (variant === 'none') return [];
  if (variant === 'short') {
    return ONBOARDING_STEPS.filter((step) => SHORT_STEP_IDS.includes(step.id));
  }
  return ONBOARDING_STEPS;
}

export type OnboardingAnswers = Partial<Record<OnboardingStepId, string | string[]>>;

export function readAnswers(): OnboardingAnswers {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as OnboardingAnswers;
  } catch {
    return {};
  }
}

export function writeAnswers(answers: OnboardingAnswers): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(answers));
  } catch {
    // quota / navigation privée : le parcours continue en mémoire
  }
}

export function answerAsString(
  answers: OnboardingAnswers,
  id: OnboardingStepId,
): string | undefined {
  const value = answers[id];
  return typeof value === 'string' ? value : undefined;
}

export function answerAsArray(
  answers: OnboardingAnswers,
  id: OnboardingStepId,
): readonly string[] {
  const value = answers[id];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

export function labelFor(id: OnboardingStepId, value: string): string {
  const step = ONBOARDING_STEPS.find((candidate) => candidate.id === id);
  if (!step || (step.kind !== 'single' && step.kind !== 'multi')) return value;
  return step.choices.find((choice) => choice.value === value)?.label ?? value;
}
