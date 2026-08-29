import { NextResponse } from 'next/server';
import { createServerSupabase, getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { RESULT_BUCKET, UPLOAD_BUCKET } from '@/lib/storage';
import type { Generation } from '@/types/db';

export const runtime = 'nodejs';

/**
 * Suppression réelle du compte : fichiers, lignes, puis le compte lui-même.
 * Tout passe par la session de l'utilisateur — `delete_own_account` ne peut
 * effacer que `auth.uid()`, jamais quelqu'un d'autre.
 */
export async function DELETE() {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: false }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const supabase = await createServerSupabase();

  const { data } = await supabase
    .from('generations')
    .select('source_path, result_path, result_bucket');

  const rows =
    (data as (Pick<Generation, 'source_path' | 'result_path'> & { result_bucket: string })[] | null) ??
    [];

  const sources = rows.map((row) => row.source_path).filter(Boolean);
  const results = rows
    .filter((row) => row.result_path && row.result_bucket === RESULT_BUCKET)
    .map((row) => row.result_path as string);

  if (sources.length > 0) await supabase.storage.from(UPLOAD_BUCKET).remove(sources);
  if (results.length > 0) await supabase.storage.from(RESULT_BUCKET).remove(results);

  const { data: deleted, error } = await supabase.rpc('delete_own_account');
  if (error || deleted !== true) {
    console.error('[account] suppression', error?.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
