/**
 * Interpolation du `prompt_template` — **serveur uniquement**.
 * Le gabarit ne vient pas du client : il est lu en base par `start_generation`,
 * la colonne n'étant pas lisible par anon/authenticated. L'utilisateur ne
 * transmet qu'un `catalogItemId`. Toute variable inconnue est vidée.
 */

export interface PromptContext {
  texture?: string;
  length?: string;
  beard?: string;
  face?: string;
  hairline?: string;
}

const TEXTURE_LABELS: Record<string, string> = {
  raides: 'raides',
  ondules: 'ondulés',
  boucles: 'bouclés',
  crepus: 'crépus',
};

const LENGTH_LABELS: Record<string, string> = {
  rase: 'rasée',
  court: 'courte',
  'mi-long': 'mi-longue',
  long: 'longue',
};

const BEARD_LABELS: Record<string, string> = {
  rase: 'rasée de près',
  'trois-jours': 'de trois jours',
  fournie: 'fournie',
  'a-tester': 'courte',
};

export function buildPrompt(template: string, context: PromptContext): string {
  const values: Record<string, string> = {
    texture: TEXTURE_LABELS[context.texture ?? ''] ?? 'naturels',
    length: LENGTH_LABELS[context.length ?? ''] ?? 'actuelle',
    beard: BEARD_LABELS[context.beard ?? ''] ?? 'inchangée',
    face: context.face && context.face !== 'inconnu' ? context.face : 'naturel',
    hairline: context.hairline ?? 'inchangée',
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? '');
}
