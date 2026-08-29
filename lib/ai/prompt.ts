/**
 * Construction de la consigne envoyée au modèle — **serveur uniquement**.
 *
 * Les gabarits ne viennent pas du client : ils sont lus en base par
 * `start_generation`, la colonne n'étant pas lisible par anon/authenticated.
 * L'utilisateur ne transmet que des identifiants de catalogue.
 *
 * La consigne est en anglais : le modèle d'édition est entraîné très
 * majoritairement dans cette langue et suit mal une consigne française.
 */

import type { CatalogCategory } from '@/types/db';

export interface PromptContext {
  texture?: string;
  length?: string;
  beard?: string;
  face?: string;
  hairline?: string;
}

const TEXTURE_LABELS: Record<string, string> = {
  raides: 'straight',
  ondules: 'wavy',
  boucles: 'curly',
  crepus: 'coily',
};

const LENGTH_LABELS: Record<string, string> = {
  rase: 'shaved',
  court: 'short',
  'mi-long': 'medium',
  long: 'long',
};

const BEARD_LABELS: Record<string, string> = {
  rase: 'clean shaven',
  'trois-jours': 'light stubble',
  fournie: 'full beard',
  'a-tester': 'short beard',
};

/**
 * Ce qu'il faut préserver se déduit de ce qui n'est PAS demandé.
 *
 * Les gabarits ne portent plus la clause « garde le reste » : deux styles
 * combinés se contrediraient — « garde la barbe » avec « change la barbe ».
 * Un modèle d'édition modifie tout ce qu'on ne lui interdit pas, donc chaque
 * famille absente doit être nommée explicitement.
 */
const PRESERVE: Record<CatalogCategory, string> = {
  cut: 'Keep the existing hairstyle, hair length and hair cut exactly as they are.',
  beard: 'Keep the existing facial hair exactly as it is.',
  color: 'Keep the existing hair colour.',
  accessory: 'Do not add any jewellery or accessory that is not already there.',
};

const ALL_CATEGORIES: readonly CatalogCategory[] = ['cut', 'beard', 'color', 'accessory'];

/**
 * Ce que le rendu a le droit de toucher, nommé positivement.
 *
 * Un modèle d'édition suit bien mieux « ne change que les cheveux » qu'une
 * liste d'interdictions reléguée en fin de consigne. La portée est donc
 * énoncée juste après l'instruction, avant tout le reste.
 */
const SCOPE: Record<CatalogCategory, string> = {
  cut: 'the hair on the head',
  beard: 'the facial hair',
  color: 'the hair colour',
  accessory: 'the added accessory',
};

function scopeSentence(categories: readonly CatalogCategory[]): string {
  const parts = ALL_CATEGORIES.filter((category) => categories.includes(category)).map(
    (category) => SCOPE[category],
  );
  if (parts.length === 0) return '';

  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

  return `Change only ${list}. Everything else in the photograph must stay pixel for pixel identical.`;
}

/**
 * Clause d'identité, ajoutée à chaque rendu. Sans elle, le modèle reconstruit
 * la personne au lieu de lui changer les cheveux.
 */
const IDENTITY_CLAUSE =
  'Do not change the face: same facial features, same face shape, same nose, ' +
  'eyes, mouth, jawline, expression and skin tone, so that the person stays ' +
  'immediately recognisable as the same individual. Keep the body, clothing, ' +
  'background, framing, camera angle and lighting exactly unchanged. ' +
  'Photorealistic photograph, natural hair texture, sharp realistic detail, ' +
  'no illustration or cartoon style.';

export function buildPrompt(
  templates: readonly string[],
  categories: readonly CatalogCategory[],
  context: PromptContext,
): string {
  const values: Record<string, string> = {
    texture: TEXTURE_LABELS[context.texture ?? ''] ?? '',
    length: LENGTH_LABELS[context.length ?? ''] ?? '',
    beard: BEARD_LABELS[context.beard ?? ''] ?? '',
    face: context.face && context.face !== 'inconnu' ? context.face : '',
    hairline: context.hairline ?? '',
  };

  const instructions = templates.map((template) =>
    template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? ''),
  );

  const asked = new Set(categories);
  const preserve = ALL_CATEGORIES.filter((category) => !asked.has(category)).map(
    (category) => PRESERVE[category],
  );

  // Les précisions du questionnaire ne sont ajoutées que si elles existent
  // vraiment : renseignées « par défaut », elles répétaient « longueur actuelle,
  // barbe inchangée » et diluaient la consigne utile.
  const details = [
    values.texture && !asked.has('cut') ? `Current hair texture: ${values.texture}.` : null,
    values.length && !asked.has('cut') ? `Current hair length: ${values.length}.` : null,
    values.beard && !asked.has('beard') ? `Beard: ${values.beard}.` : null,
  ].filter((part): part is string => part !== null);

  return [
    ...instructions,
    scopeSentence(categories),
    ...details,
    ...preserve,
    IDENTITY_CLAUSE,
  ]
    .filter((part) => part.length > 0)
    .join(' ');
}
