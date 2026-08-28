import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decodePath, GENERATION_BUCKET, SELFIE_BUCKET } from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * Suppression de compte — réelle, pas symbolique (section 9).
 *
 * Ordre : fichiers Storage d'abord (ils ne sont référencés nulle part
 * ailleurs), puis l'utilisateur `auth.users`. La cascade des clés étrangères
 * emporte `profiles`, `generations`, `credit_ledger` et
 * `onboarding_responses`.
 */
export async function POST(): Promise<NextResponse> {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ message: 'Connecte-toi d’abord.' }, { status: 401 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ message: 'Service indisponible.' }, { status: 503 });
  }

  const userId = session.user.id;

  const { data: paths } = await admin.rpc('list_user_media', { p_user_id: userId });

  const selfies: string[] = [];
  const results: string[] = [];

  for (const row of (paths ?? []) as { path: string | null }[]) {
    if (!row.path) continue;
    const decoded = decodePath(row.path);
    if (!decoded) continue;
    if (decoded.bucket === SELFIE_BUCKET) selfies.push(decoded.path);
    if (decoded.bucket === GENERATION_BUCKET) results.push(decoded.path);
  }

  if (selfies.length > 0) {
    const { error } = await admin.storage.from(SELFIE_BUCKET).remove(selfies);
    if (error) console.error('[account/delete] selfies non supprimés', error.message);
  }
  if (results.length > 0) {
    const { error } = await admin.storage.from(GENERATION_BUCKET).remove(results);
    if (error) console.error('[account/delete] résultats non supprimés', error.message);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('[account/delete] suppression impossible', deleteError.message);
    return NextResponse.json(
      { message: 'La suppression a échoué. Réessaie ou contacte-nous.' },
      { status: 500 },
    );
  }

  await session.supabase.auth.signOut();

  return NextResponse.json({ deleted: true });
}
