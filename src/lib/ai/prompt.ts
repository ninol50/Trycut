import type { OnboardingAnswers } from '@/lib/onboarding';

/**
 * Interpolation des `prompt_template` — côté serveur exclusivement.
 *
 * L'utilisateur n'envoie jamais de texte libre : le client transmet un slug de
 * catalogue, le serveur récupère le template correspondant et ne remplace que
 * les variables connues ci-dessous. Toute variable inconnue est remplacée par
 * une valeur neutre plutôt que laissée telle quelle dans le prompt.
 */

const TEXTURE_LABELS: Record<string, string> = {
  straight: 'raides',
  wavy: 'ondulés',
  curly: 'bouclés',
  coily: 'crépus',
};

const FACE_LABELS: Record<string, string> = {
  oval: 'ovale',
  round: 'rond',
  square: 'carré',
  oblong: 'allongé',
};

const BEARD_LABELS: Record<string, string> = {
  clean: 'rasé de près, à conserver tel quel',
  stubble: 'barbe courte de quelques jours, à conserver telle quelle',
  full: 'barbe fournie, à conserver telle quelle',
  test: 'barbe telle qu’elle apparaît sur la photo, à conserver',
};

const LENGTH_LABELS: Record<string, string> = {
  shaved: 'rasée',
  short: 'courte',
  mid: 'mi-longue',
  long: 'longue',
};

type Variable = 'texture' | 'face_shape' | 'beard' | 'current_length';

function resolve(variable: Variable, answers: OnboardingAnswers): string {
  switch (variable) {
    case 'texture':
      return TEXTURE_LABELS[answers.texture ?? ''] ?? 'telle qu’elle apparaît sur la photo';
    case 'face_shape':
      return FACE_LABELS[answers.faceShape ?? ''] ?? 'telle qu’elle apparaît sur la photo';
    case 'beard':
      return BEARD_LABELS[answers.beard ?? ''] ?? 'telle qu’elle apparaît sur la photo, à conserver';
    case 'current_length':
      return LENGTH_LABELS[answers.length ?? ''] ?? 'celle de la photo';
  }
}

const VARIABLE_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/g;
const KNOWN: readonly Variable[] = ['texture', 'face_shape', 'beard', 'current_length'];

function isKnown(name: string): name is Variable {
  return (KNOWN as readonly string[]).includes(name);
}

export function buildPrompt(template: string, answers: OnboardingAnswers): string {
  return template.replace(VARIABLE_PATTERN, (_match, name: string) =>
    isKnown(name) ? resolve(name, answers) : 'telle qu’elle apparaît sur la photo',
  );
}
