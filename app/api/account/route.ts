import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';
import { loadProfile } from '@/lib/profile';
import { isSupabaseConfigured } from '@/lib/env';
import { RESULT_BUCKET, UPLOAD_BUCKET, removeObjects } from '@/lib/storage';
import type { Generation } from '@/types/db';

export const runtime = 'nodejs';

/**
 * Suppression réelle du compte : profil, générations et tous les fichiers
 * Storage associés. Rien n'est laissé derrière.
 */
export async function DELETE() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const session = await loadProfile();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const userId = session.user.id;
  const admin = createAdminSupabase();

  const { data } = await admin
    .from('generations')
    .select('source_path, result_path')
    .eq('user_id', userId);

  const rows = (data as Pick<Generation, 'source_path' | 'result_path'>[] | null) ?? [];

  await removeObjects(
    admin,
    UPLOAD_BUCKET,
    rows.map((row) => row.source_path).filter((path): path is string => Boolean(path)),
  );
  await removeObjects(
    admin,
    RESULT_BUCKET,
    rows.map((row) => row.result_path).filter((path): path is string => Boolean(path)),
  );

  await admin.from('generations').delete().eq('user_id', userId);
  await admin.from('onboarding_responses').delete().eq('user_id', userId);
  await admin.from('credit_ledger').delete().eq('user_id', userId);
  await admin.from('profiles').delete().eq('id', userId);

  // Supprime le compte auth en dernier : le cascade nettoie ce qui resterait.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('[account] suppression auth', error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
