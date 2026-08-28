import type { SupabaseClient } from '@supabase/supabase-js';

export const SELFIE_BUCKET = 'selfies';
export const GENERATION_BUCKET = 'generations';

/** Durée de vie des URL signées : 60 s, comme imposé par le brief. */
export const SIGNED_URL_TTL_SECONDS = 60;

export interface StoragePath {
  bucket: string;
  path: string;
}

/**
 * Un chemin est stocké sous la forme `bucket:chemin/dans/le/bucket`.
 * Ça évite d'avoir à deviner le bucket à la lecture d'une ligne `generations`.
 */
export function encodePath(bucket: string, path: string): string {
  return `${bucket}:${path}`;
}

export function decodePath(stored: string): StoragePath | null {
  const separator = stored.indexOf(':');
  if (separator <= 0) return null;
  const bucket = stored.slice(0, separator);
  const path = stored.slice(separator + 1);
  if (!bucket || !path) return null;
  if (bucket !== SELFIE_BUCKET && bucket !== GENERATION_BUCKET) return null;
  return { bucket, path };
}

/**
 * URL signée 60 s. Aucun bucket n'étant public, c'est le seul moyen d'accéder
 * à un fichier — et l'appelant a toujours vérifié la propriété de la ligne au
 * préalable.
 */
export async function signedUrl(
  supabase: SupabaseClient,
  stored: string,
): Promise<string | null> {
  const decoded = decodePath(stored);
  if (!decoded) return null;

  const { data, error } = await supabase.storage
    .from(decoded.bucket)
    .createSignedUrl(decoded.path, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return null;
  return data.signedUrl;
}

/** `selfies:<owner>/<uuid>.jpg` — `owner` est un user_id ou `guest/<guest_id>`. */
export function selfieObjectPath(owner: string, fileId: string, extension: string): string {
  return `${owner}/${fileId}.${extension}`;
}

export function generationObjectPath(owner: string, generationId: string): string {
  return `${owner}/${generationId}.jpg`;
}
