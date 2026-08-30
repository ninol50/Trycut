import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const runtime = 'nodejs';

/**
 * Pose le secret du webhook Whop depuis la page admin.
 *
 * Le contrôle « est-ce un administrateur » vit dans `admin_set_whop_secret`,
 * en base : l'app ne peut pas l'oublier. Le secret n'est jamais relu ni
 * renvoyé — on ne répond que par oui ou non.
 */
const schema = z.object({
  secret: z.string().min(10).max(400),
});

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: false }, { status: 503 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Secret invalide.' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('admin_set_whop_secret', {
    p_secret: parsed.data.secret,
  });

  if (error) {
    const forbidden = error.code === '42501' || error.message.includes('administrateur');
    return NextResponse.json({ ok: false }, { status: forbidden ? 403 : 500 });
  }

  return NextResponse.json({ ok: data === true });
}

export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json({ configured: false }, { status: 503 });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('admin_has_whop_secret');

  if (error) return NextResponse.json({ configured: false }, { status: 403 });
  return NextResponse.json({ configured: data === true });
}
