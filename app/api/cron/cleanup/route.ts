import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';
import { env, isSupabaseConfigured } from '@/lib/env';
import { RESULT_BUCKET, UPLOAD_BUCKET, removeObjects } from '@/lib/storage';
import { listValidMemberships } from '@/lib/whop-api';
import { accorderDepuisWhop } from '@/lib/whop-reconcile';
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
  if (!admin) {
    // La purge traverse tous les comptes : elle ne peut pas passer par la RLS.
    return NextResponse.json(
      { error: 'service_role_manquante', message: 'SUPABASE_SERVICE_ROLE_KEY absente.' },
      { status: 503 },
    );
  }

  // Les coupes restées « en cours » : personne ne les débloquera si l'onglet a
  // été fermé, l'écran de suivi étant le seul autre appelant.
  const { data: swept, error: sweepError } = await admin.rpc('sweep_stale_generations');
  if (sweepError) {
    console.error('[cron] balayage des rendus bloqués', sweepError.message);
  }

  const now = Date.now();
  const cutoffUsers = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const cutoffAnon = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const purgeUsers = await purge(admin, 'user', cutoffUsers);
  const purgeAnon = await purge(admin, 'anon', cutoffAnon);
  const rattrapes = await rattraperPaiements(admin);

  return NextResponse.json({
    ok: true,
    comptes: purgeUsers,
    anonymes: purgeAnon,
    rendus_debloques: typeof swept === 'number' ? swept : null,
    paiements_rattrapes: rattrapes,
  });
}

type Admin = NonNullable<ReturnType<typeof createAdminSupabase>>;

/**
 * Dernier filet : tous les abonnements valides chez Whop sont confrontés aux
 * comptes du site, et tout retard est rattrapé.
 *
 * Le webhook crédite en quelques secondes et le bouton « j'ai déjà payé »
 * couvre celui qui revient sur le site. Restent ceux qui paient et ne
 * reviennent pas, le jour où le message se perd : sans ce passage, ils
 * resteraient bloqués sans que personne le sache. La fonction appelée est
 * idempotente — repasser ici ne crédite pas deux fois.
 *
 * Sans clé API Whop, la liste est nulle et ce passage ne fait rien.
 */
async function rattraperPaiements(admin: Admin): Promise<number> {
  const rows = await listValidMemberships(true);
  if (!rows || rows.length === 0) return 0;

  const emails = rows.map((row) => row.email);
  const comptes = new Map<string, { email: string | null; billing_email: string | null }>();

  for (const colonne of ['email', 'billing_email'] as const) {
    const { data } = await admin
      .from('profiles')
      .select('id, email, billing_email')
      .in(colonne, emails);

    for (const ligne of (data as
      | { id: string; email: string | null; billing_email: string | null }[]
      | null) ?? []) {
      comptes.set(ligne.id, { email: ligne.email, billing_email: ligne.billing_email });
    }
  }

  let accordes = 0;
  for (const [id, compte] of comptes) {
    const etat = await accorderDepuisWhop(id, [compte.email, compte.billing_email]);
    if (etat === 'accorde') accordes += 1;
  }

  return accordes;
}

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
