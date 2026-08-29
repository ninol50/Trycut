/**
 * Lecture du rappel d'un fournisseur d'IA.
 *
 * Chaque fournisseur a sa propre forme. Le mock envoie nos champs à plat ;
 * fal.ai renvoie `{ status: 'OK' | 'ERROR', payload: { images: [{ url }] } }`.
 *
 * Sans ces deux lecteurs, brancher fal.ai coûtait de l'argent pour rien :
 * l'image produite était ignorée et la personne recevait sa photo d'origine,
 * tandis qu'un rendu raté passait pour une réussite, donc sans remboursement.
 */

/** Vrai si le fournisseur signale un échec, quelle que soit sa casse. */
export function isFailureCallback(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false;
  const status = (payload as { status?: unknown }).status;
  if (typeof status !== 'string') return false;
  const normalized = status.toLowerCase();
  return normalized === 'failed' || normalized === 'error';
}

/** URL de l'image produite, à plat ou dans l'enveloppe de fal.ai. */
export function extractResultImageUrl(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;

  const flat = (payload as { image_url?: unknown }).image_url;
  if (typeof flat === 'string' && flat.length > 0) return flat;

  const inner = (payload as { payload?: unknown }).payload;
  if (typeof inner !== 'object' || inner === null) return null;

  const images = (inner as { images?: unknown }).images;
  if (!Array.isArray(images)) return null;

  const first: unknown = images[0];
  if (typeof first !== 'object' || first === null) return null;

  const link = (first as { url?: unknown }).url;
  return typeof link === 'string' && link.length > 0 ? link : null;
}

/**
 * URL d'appel de la file d'attente fal.ai.
 *
 * `fal_webhook` est un paramètre de l'URL de requête, pas un champ du corps.
 * Placé dans le corps, il est ignoré sans erreur : la tâche est acceptée, elle
 * se termine, et le rappel n'arrive jamais. L'écran de suivi tourne alors
 * jusqu'à expiration alors que l'image existe.
 */
export function buildFalEndpoint(
  model: string,
  webhookUrl: string,
  generationId: string,
  callbackSecret: string,
): string {
  const callback = new URL(webhookUrl);
  callback.searchParams.set('generation_id', generationId);
  // fal ne relaie pas nos en-têtes : le secret de la ligne voyage dans l'URL.
  callback.searchParams.set('secret', callbackSecret);

  const endpoint = new URL(`https://queue.fal.run/${model}`);
  endpoint.searchParams.set('fal_webhook', callback.toString());
  return endpoint.toString();
}
