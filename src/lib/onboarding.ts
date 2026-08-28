/**
 * Les 13 écrans du questionnaire (section 5).
 *
 * Source de vérité unique : l'UI, la persistance `localStorage` et le filtrage
 * du catalogue lisent tous ce fichier. Les `tag` portés par chaque option sont
 * exactement le vocabulaire de `catalog_items.style_tags` — c'est ce qui rend
 * le questionnaire réellement structurant plutôt que décoratif.
 */

export const ONBOARDING_STORAGE_KEY = 'onboarding_v1';
export const ONBOARDING_TOTAL_STEPS = 13;

export type AnswerKey =
  | 'goal'
  | 'length'
  | 'texture'
  | 'hairline'
  | 'faceShape'
  | 'style'
  | 'beard'
  | 'accessories'
  | 'boldness'
  | 'firstName';

export interface Choice {
  value: string;
  label: string;
  /** Tag de catalogue correspondant. `null` = la réponse ne filtre rien. */
  tag: string | null;
}

interface BaseScreen {
  /** Numéro affiché : « Étape {step} sur 13 ». */
  step: number;
  title: string;
  subtitle?: string;
}

export interface ChoiceScreen extends BaseScreen {
  kind: 'choice';
  key: AnswerKey;
  choices: Choice[];
  /** Vignettes illustrées (écrans 5 et 7). */
  illustrated?: boolean;
}

export interface MultiScreen extends BaseScreen {
  kind: 'multi';
  key: AnswerKey;
  choices: Choice[];
  /** Valeur exclusive : la cocher décoche tout le reste. */
  exclusiveValue?: string;
}

export interface TextScreen extends BaseScreen {
  kind: 'text';
  key: AnswerKey;
  placeholder: string;
  maxLength: number;
}

export interface TransitionScreen extends BaseScreen {
  kind: 'transition';
  /** `counter` = compteur animé, `skeleton` = squelette de chargement 2 s. */
  visual: 'counter';
  counterTo: number;
  counterSuffix: string;
}

export interface SkeletonScreen extends BaseScreen {
  kind: 'skeleton';
  durationMs: number;
}

export interface SummaryScreen extends BaseScreen {
  kind: 'summary';
}

export type OnboardingScreen =
  | ChoiceScreen
  | MultiScreen
  | TextScreen
  | TransitionScreen
  | SkeletonScreen
  | SummaryScreen;

export const ONBOARDING_SCREENS: readonly OnboardingScreen[] = [
  {
    step: 1,
    kind: 'choice',
    key: 'goal',
    title: 'Ton objectif',
    subtitle: 'On adapte tout le reste à ça.',
    choices: [
      { value: 'cut', label: 'Changer de coupe', tag: null },
      { value: 'color', label: 'Tester une couleur', tag: null },
      { value: 'accessory', label: 'Essayer des accessoires', tag: null },
      { value: 'explore', label: 'Juste voir ce que ça donne', tag: null },
    ],
  },
  {
    step: 2,
    kind: 'choice',
    key: 'length',
    title: 'Ta longueur actuelle',
    choices: [
      { value: 'shaved', label: 'Rasé', tag: 'len:shaved' },
      { value: 'short', label: 'Court', tag: 'len:short' },
      { value: 'mid', label: 'Mi-long', tag: 'len:mid' },
      { value: 'long', label: 'Long', tag: 'len:long' },
    ],
  },
  {
    step: 3,
    kind: 'choice',
    key: 'texture',
    title: 'Ta texture',
    choices: [
      { value: 'straight', label: 'Raides', tag: 'tex:straight' },
      { value: 'wavy', label: 'Ondulés', tag: 'tex:wavy' },
      { value: 'curly', label: 'Bouclés', tag: 'tex:curly' },
      { value: 'coily', label: 'Crépus', tag: 'tex:coily' },
    ],
  },
  {
    step: 4,
    kind: 'choice',
    key: 'hairline',
    title: 'Ligne de cheveux',
    subtitle: 'Ça change les coupes qu’on te propose.',
    choices: [
      { value: 'full', label: 'Pleine', tag: 'hairline:full' },
      { value: 'slight', label: 'Légèrement dégarnie', tag: 'hairline:slight' },
      { value: 'receding', label: 'Dégarnie', tag: 'hairline:receding' },
      { value: 'unknown', label: 'Je préfère ne pas dire', tag: null },
    ],
  },
  {
    step: 5,
    kind: 'choice',
    key: 'faceShape',
    title: 'Forme du visage',
    subtitle: 'Pas sûr ? On l’estime à partir de ta photo.',
    illustrated: true,
    choices: [
      { value: 'oval', label: 'Ovale', tag: 'face:oval' },
      { value: 'round', label: 'Rond', tag: 'face:round' },
      { value: 'square', label: 'Carré', tag: 'face:square' },
      { value: 'oblong', label: 'Allongé', tag: 'face:oblong' },
      { value: 'unknown', label: 'Je ne sais pas', tag: null },
    ],
  },
  {
    step: 6,
    kind: 'transition',
    title: '7 hommes sur 10 repoussent un changement de coupe par peur du résultat.',
    subtitle: 'Trente secondes ici évitent trois mois de regret.',
    visual: 'counter',
    counterTo: 7,
    counterSuffix: ' sur 10',
  },
  {
    step: 7,
    kind: 'choice',
    key: 'style',
    title: 'Ton style',
    illustrated: true,
    choices: [
      { value: 'classic', label: 'Classique', tag: 'style:classic' },
      { value: 'street', label: 'Streetwear', tag: 'style:street' },
      { value: 'sport', label: 'Sportif', tag: 'style:sport' },
      { value: 'neat', label: 'Soigné', tag: 'style:neat' },
    ],
  },
  {
    step: 8,
    kind: 'choice',
    key: 'beard',
    title: 'Barbe',
    choices: [
      { value: 'clean', label: 'Rasé de près', tag: null },
      { value: 'stubble', label: 'Barbe de 3 jours', tag: null },
      { value: 'full', label: 'Barbe fournie', tag: null },
      { value: 'test', label: 'Je veux tester', tag: null },
    ],
  },
  {
    step: 9,
    kind: 'multi',
    key: 'accessories',
    title: 'Accessoires qui t’intéressent',
    subtitle: 'Plusieurs réponses possibles.',
    exclusiveValue: 'none',
    choices: [
      { value: 'chains', label: 'Chaînes', tag: 'acc:chains' },
      { value: 'earrings', label: 'Boucles d’oreilles', tag: 'acc:earrings' },
      { value: 'grillz', label: 'Grillz', tag: 'acc:grillz' },
      { value: 'none', label: 'Aucun', tag: null },
    ],
  },
  {
    step: 10,
    kind: 'skeleton',
    title: 'On sélectionne les coupes adaptées à ta texture et à ton visage.',
    durationMs: 2000,
  },
  {
    step: 11,
    kind: 'choice',
    key: 'boldness',
    title: 'Ton niveau d’audace',
    choices: [
      { value: 'low', label: 'Discret', tag: 'bold:low' },
      { value: 'mid', label: 'Modéré', tag: 'bold:mid' },
      { value: 'high', label: 'Je veux qu’on remarque', tag: 'bold:high' },
    ],
  },
  {
    step: 12,
    kind: 'text',
    key: 'firstName',
    title: 'Ton prénom',
    subtitle: 'Pour la suite du parcours.',
    placeholder: 'Karim',
    maxLength: 24,
  },
  {
    step: 13,
    kind: 'summary',
    title: 'Ton profil',
  },
] as const;

/** Réponses telles qu'elles vivent dans `localStorage` sous `onboarding_v1`. */
export interface OnboardingAnswers {
  goal?: string;
  length?: string;
  texture?: string;
  hairline?: string;
  faceShape?: string;
  style?: string;
  beard?: string;
  accessories?: string[];
  boldness?: string;
  firstName?: string;
}

const SINGLE_KEYS: readonly Exclude<AnswerKey, 'accessories' | 'firstName'>[] = [
  'goal',
  'length',
  'texture',
  'hairline',
  'faceShape',
  'style',
  'beard',
  'boldness',
];

function screenForKey(key: AnswerKey): ChoiceScreen | MultiScreen | undefined {
  return ONBOARDING_SCREENS.find(
    (s): s is ChoiceScreen | MultiScreen =>
      (s.kind === 'choice' || s.kind === 'multi') && s.key === key,
  );
}

/** Libellé lisible d'une réponse — utilisé par le récapitulatif de l'écran 13. */
export function labelForAnswer(key: AnswerKey, value: string): string {
  const screen = screenForKey(key);
  return screen?.choices.find((c) => c.value === value)?.label ?? value;
}

/**
 * Traduit les réponses en tags de catalogue.
 * Ce sont les écrans 2, 3, 5, 7 et 9 qui filtrent réellement — plus 4 et 11
 * qui affinent le classement.
 */
export function answersToTags(answers: OnboardingAnswers): string[] {
  const tags: string[] = [];

  for (const key of SINGLE_KEYS) {
    const value = answers[key];
    if (!value) continue;
    const tag = screenForKey(key)?.choices.find((c) => c.value === value)?.tag;
    if (tag) tags.push(tag);
  }

  const accessoryScreen = screenForKey('accessories');
  for (const value of answers.accessories ?? []) {
    const tag = accessoryScreen?.choices.find((c) => c.value === value)?.tag;
    if (tag) tags.push(tag);
  }

  return tags;
}

/** Parse défensif : le `localStorage` est de la donnée non fiable. */
export function parseAnswers(raw: string | null): OnboardingAnswers {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const source = parsed as Record<string, unknown>;
    const result: OnboardingAnswers = {};

    for (const key of SINGLE_KEYS) {
      const value = source[key];
      if (typeof value === 'string') result[key] = value;
    }
    if (typeof source['firstName'] === 'string') {
      result.firstName = source['firstName'].slice(0, 24);
    }
    if (Array.isArray(source['accessories'])) {
      result.accessories = source['accessories'].filter(
        (v): v is string => typeof v === 'string',
      );
    }
    return result;
  } catch {
    return {};
  }
}

/** Le questionnaire est considéré terminé quand les écrans structurants sont remplis. */
export function isComplete(answers: OnboardingAnswers): boolean {
  return Boolean(
    answers.goal &&
      answers.length &&
      answers.texture &&
      answers.faceShape &&
      answers.style &&
      answers.boldness &&
      answers.firstName,
  );
}
