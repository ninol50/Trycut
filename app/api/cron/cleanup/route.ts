import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';
import { env, isSupabaseConfigured } from '@/lib/env';
import { RESULT_BUCKET, UPLOAD_BUCKET, removeObjects } from '@/lib/storage';
import type { Generation } from '@/types/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * `cleanup_expired_media` — cron quotidien Vercel.
 * Comptes : J+30. Essais anonymes : J+1.
 */
export async function GET(request: NextRequest) {
  // Vercel signe ses crons via l'en-tête Authorization.
  const authorized =
    !env.cronSecret || request.headers.get('authorization') === `Bearer ${env.cronSecret}`;

  if (!authorized) {
    return NextResponse.json({ error: 'interdit' }, { status: 401 });
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'indisponible' }, { status: 503 });
  }

  const admin = createAdminSupabase();
  const now = Date.now();
  const cutoffUsers = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const cutoffAnon = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const purgeUsers = await purge(admin, 'user', cutoffUsers);
  const purgeAnon = await purge(admin, 'anon', cutoffAnon);

  return NextResponse.json({
    ok: true,
    comptes: purgeUsers,
    anonymes: purgeAnon,
  });
}

type Admin = ReturnType<typeof createAdminSupabase>;

async function purge(admin: Admin, scope: 'user' | 'anon', cutoff: string): Promise<number> {
  const query = admin
    .from('generations')
    .select('id, source_path, result_path')
    .lt('created_at', cutoff)
    .limit(500);

  const { data } = scope === 'anon' ? await query.is('user_id', null) : await query.not('user_id', 'is', null);

  const rows = (data as Pick<Generation, 'id' | 'source_path' | 'result_path'>[] | null) ?? [];
  if (rows.length === 0) return 0;

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

  await admin
    .from('generations')
    .delete()
    .in('id', rows.map((row) => row.id));

  return rows.length;
}
