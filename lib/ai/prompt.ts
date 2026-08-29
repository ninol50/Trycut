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
 * Clause d'identité, ajoutée à chaque rendu.
 *
 * Le modèle d'édition ne garde le visage que si on le lui demande explicitement.
 * Sans elle, il reconstruit la personne au lieu de lui changer les cheveux.
 * En anglais comme le reste : le modèle suit mal une consigne française.
 */
const IDENTITY_CLAUSE =
  'Keep the person’s face, identity, facial features, expression, skin tone, ' +
  'body, clothing, background, framing, camera angle and lighting exactly ' +
  'unchanged. Change nothing except what is asked above. Photorealistic ' +
  'photograph, natural hair texture, sharp realistic detail, no illustration ' +
  'or cartoon style.';

export function buildPrompt(template: string, context: PromptContext): string {
  const values: Record<string, string> = {
    texture: TEXTURE_LABELS[context.texture ?? ''] ?? '',
    length: LENGTH_LABELS[context.length ?? ''] ?? '',
    beard: BEARD_LABELS[context.beard ?? ''] ?? '',
    face: context.face && context.face !== 'inconnu' ? context.face : '',
    hairline: context.hairline ?? '',
  };

  const instruction = template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? '');

  // Les précisions du questionnaire ne sont ajoutées que si elles existent
  // vraiment. Renseignées « par défaut », elles répétaient « longueur actuelle,
  // barbe inchangée » à chaque rendu : trois affirmations vides qui diluaient
  // la consigne utile.
  const details = [
    values.texture ? `Current hair texture: ${values.texture}.` : null,
    values.length ? `Current hair length: ${values.length}.` : null,
    values.beard ? `Beard: ${values.beard}.` : null,
  ].filter((part): part is string => part !== null);

  return [instruction, ...details, IDENTITY_CLAUSE].join(' ');
}
