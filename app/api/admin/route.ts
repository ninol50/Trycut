import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminSupabase, createServerSupabase, getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { CREDITS_BY_PLAN } from '@/lib/pricing';

export const runtime = 'nodejs';

/**
 * Change le statut d'accès d'un inscrit. Le contrôle « est-ce un administrateur »
 * vit dans `admin_set_access`, en base : l'app ne peut pas l'oublier.
 */
const schema = z.union([
  z.object({
    userId: z.string().uuid(),
    status: z.enum(['approved', 'granted', 'rejected']),
  }),
  z.object({
    userId: z.string().uuid(),
    /** Abonnement rattaché à la main depuis Whop. `free` le retire. */
    plan: z.enum(['free', 'pack', 'pass', 'trimestre']),
  }),
]);

type Statut = 'approved' | 'granted' | 'rejected';

/**
 * Vérification d'administrateur faite par l'application.
 *
 * Doublon assumé du contrôle en base : il n'a le droit d'exister que parce
 * qu'il garde le repli ci-dessous, lequel écrit avec la clé de service et ne
 * passe donc plus par la RLS. Sans lui, ce repli serait une porte ouverte.
 */
async function estAdministrateur(userId: string): Promise<boolean> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  return (data as { is_admin: boolean } | null)?.is_admin === true;
}

/**
 * Repli quand la fonction en base refuse le statut.
 *
 * `admin_set_access` a été écrite avant que l'accès offert existe et refuse
 * 'granted' : accorder l'accès levait une exception, et l'écran annulait la
 * ligne aussitôt affichée. La migration qui reconstruit la fonction règle la
 * cause ; ce repli règle le présent, sans accès à la console de la base.
 *
 * Il écrit ce que la fonction aurait écrit — le statut et la date de revue —
 * et rien d'autre : ni offre, ni crédits.
 */
async function ecrireStatutSansFonction(
  userId: string,
  status: Statut,
): Promise<'ok' | 'introuvable' | 'impossible'> {
  const admin = createAdminSupabase();
  if (!admin) return 'impossible';

  const { data, error } = await admin
    .from('profiles')
    .update({ access_status: status, reviewed_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id');

  if (error) return 'impossible';
  return ((data as { id: string }[] | null) ?? []).length > 0 ? 'ok' : 'introuvable';
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: false }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = await createServerSupabase();

  if ('plan' in parsed.data) {
    const { data, error } = await supabase.rpc('admin_set_subscription', {
      p_user_id: parsed.data.userId,
      p_plan: parsed.data.plan,
      p_credits: CREDITS_BY_PLAN[parsed.data.plan],
    });

    if (error) {
      // 42501 = droits insuffisants, levé par la fonction elle-même.
      const interdit = error.code === '42501' || error.message.includes('administrateur');
      return NextResponse.json({ ok: false }, { status: interdit ? 403 : 500 });
    }

    return NextResponse.json({ ok: data === true });
  }

  const { data, error } = await supabase.rpc('admin_set_access', {
    p_user_id: parsed.data.userId,
    p_status: parsed.data.status,
  });

  if (!error) return NextResponse.json({ ok: data === true });

  if (error.code === '42501' || error.message.includes('administrateur')) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  // La fonction a échoué pour autre chose que les droits : statut qu'elle ne
  // connaît pas, ou fonction absente. On revérifie nous-mêmes, puis on écrit.
  if (!(await estAdministrateur(user.id))) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const repli = await ecrireStatutSansFonction(parsed.data.userId, parsed.data.status);
  if (repli === 'ok') return NextResponse.json({ ok: true });

  return NextResponse.json({ ok: false }, { status: repli === 'introuvable' ? 404 : 500 });
}
