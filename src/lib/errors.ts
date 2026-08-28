import type { GenerationErrorCode } from '@/lib/ai/types';

/**
 * Messages d'erreur utilisateur (section 7.2).
 * Jamais de message générique : chaque cas dit ce qui s'est passé et ce qu'il
 * faut faire ensuite.
 */

export interface UiError {
  title: string;
  action?: { label: string; href: string };
}

export const GENERATION_ERRORS: Record<GenerationErrorCode, UiError> = {
  quota: {
    title: 'Il te reste 0 crédit.',
    action: { label: 'Voir les tarifs', href: '/tarifs' },
  },
  network: {
    title: 'La connexion a été interrompue. Réessaie.',
  },
  file: {
    title: 'Format non supporté. Utilise un JPG ou un PNG de moins de 10 Mo.',
  },
  no_face: {
    title: 'On ne détecte pas de visage sur cette photo. Reprends-en une de face.',
  },
  provider: {
    title: 'La génération a échoué. Ton crédit t’a été rendu, réessaie.',
  },
  timeout: {
    title: 'La génération met trop de temps. Ton crédit t’a été rendu, réessaie.',
  },
};

export function isGenerationErrorCode(value: unknown): value is GenerationErrorCode {
  return typeof value === 'string' && value in GENERATION_ERRORS;
}

export function uiErrorFor(code: string | null | undefined): UiError {
  if (isGenerationErrorCode(code)) return GENERATION_ERRORS[code];
  return GENERATION_ERRORS.provider;
}

/** Motifs renvoyés par `start_generation`, traduits en message et en code HTTP. */
export const START_FAILURE_MESSAGES: Record<string, { status: number; code: string; message: string }> = {
  no_credits: {
    status: 402,
    code: 'quota',
    message: 'Il te reste 0 crédit.',
  },
  daily_cap_reached: {
    status: 503,
    code: 'quota',
    message:
      'Beaucoup de monde en ce moment. Reviens dans quelques heures ou passe en pack pour un accès prioritaire.',
  },
  rate_limited: {
    status: 429,
    code: 'quota',
    message: 'Tu as atteint la limite d’essais pour l’instant. Reviens dans un moment.',
  },
  guest_trial_used: {
    status: 403,
    code: 'quota',
    message: 'Ton essai offert a déjà été utilisé. Crée un compte pour continuer.',
  },
  unknown_catalog_item: {
    status: 400,
    code: 'file',
    message: 'Ce style n’existe plus. Choisis-en un autre.',
  },
  premium_locked: {
    status: 403,
    code: 'quota',
    message: 'Ce style fait partie du catalogue premium.',
  },
};
