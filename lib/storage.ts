import type { SupabaseClient } from '@supabase/supabase-js';

export const UPLOAD_BUCKET = 'selfies';
export const RESULT_BUCKET = 'generations';
const SIGNED_URL_TTL = 60; // secondes

/**
 * Aucun bucket public : tout accès passe par une URL signée 60s,
 * générée après vérification serveur de la propriété de la ligne.
 */
export async function signedUrl(
  admin: SupabaseClient,
  bucket: string,
  path: string,
): Promise<string | null> {
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Préfixe de stockage : `{user_id}/…` ou `anon/{token}/…`. */
export function ownerPrefix(userId: string | null, anonToken: string | null): string {
  if (userId) return userId;
  return `anon/${anonToken ?? 'inconnu'}`;
}

export async function removeObjects(
  admin: SupabaseClient,
  bucket: string,
  paths: readonly string[],
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await admin.storage.from(bucket).remove([...paths]);
  if (error) console.error('[storage] suppression', bucket, error.message);
}
