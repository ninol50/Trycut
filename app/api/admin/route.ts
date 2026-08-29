import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabase, getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const runtime = 'nodejs';

/**
 * Change le statut d'accès d'un inscrit. Le contrôle « est-ce un administrateur »
 * vit dans `admin_set_access`, en base : l'app ne peut pas l'oublier.
 */
const schema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'rejected']),
});

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: false }, { status: 503 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('admin_set_access', {
    p_user_id: parsed.data.userId,
    p_status: parsed.data.status,
  });

  if (error) {
    // 42501 = droits insuffisants, levé par la fonction elle-même.
    const forbidden = error.code === '42501' || error.message.includes('administrateur');
    return NextResponse.json({ ok: false }, { status: forbidden ? 403 : 500 });
  }

  return NextResponse.json({ ok: data === true });
}
