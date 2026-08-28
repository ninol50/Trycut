import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decodePath, GENERATION_BUCKET, SELFIE_BUCKET } from '@/lib/storage';
import { requireEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * `cleanup_expired_media` — purge J+30 (section 9).
 *
 * Déclenché par le cron Vercel déclaré dans `vercel.json`. La fonction
 * Postgres `expire_old_media` efface les références et renvoie les chemins
 * concernés ; on supprime ensuite les objets correspondants dans les buckets.
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: 'Non autorisé.' }, { status: 401 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ message: 'Service indisponible.' }, { status: 503 });
  }

  const { data, error } = await admin.rpc('expire_old_media', { p_days: 30 });
  if (error) {
    console.error('[cron:cleanup] expire_old_media a échoué', error.message);
    return NextResponse.json({ message: 'Purge impossible.' }, { status: 500 });
  }

  const selfies: string[] = [];
  const results: string[] = [];

  for (const row of (data ?? []) as { path: string | null }[]) {
    if (!row.path) continue;
    const decoded = decodePath(row.path);
    if (!decoded) continue;
    if (decoded.bucket === SELFIE_BUCKET) selfies.push(decoded.path);
    if (decoded.bucket === GENERATION_BUCKET) results.push(decoded.path);
  }

  if (selfies.length > 0) {
    const { error: removeError } = await admin.storage.from(SELFIE_BUCKET).remove(selfies);
    if (removeError) console.error('[cron:cleanup] selfies', removeError.message);
  }
  if (results.length > 0) {
    const { error: removeError } = await admin.storage.from(GENERATION_BUCKET).remove(results);
    if (removeError) console.error('[cron:cleanup] résultats', removeError.message);
  }

  // Les empreintes d'IP ne servent que sur 24 h : au-delà, elles n'ont plus
  // d'utilité et n'ont donc pas à être conservées.
  await admin
    .from('ip_generation_log')
    .delete()
    .lt('created_at', new Date(Date.now() - 48 * 3600 * 1000).toISOString());

  console.info(
    `[cron:cleanup] ${selfies.length} selfie(s) et ${results.length} résultat(s) supprimés`,
  );

  return NextResponse.json({
    deletedSelfies: selfies.length,
    deletedResults: results.length,
  });
}

function isAuthorized(request: Request): boolean {
  const secret = requireEnv('CRON_SECRET');
  const header = request.headers.get('authorization');
  const provided = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!provided || provided.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
}
