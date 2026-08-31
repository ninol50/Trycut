import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { listValidMemberships } from '@/lib/whop-api';

export const runtime = 'nodejs';

/**
 * Réglages Whop, posés depuis la page admin.
 *
 * Le contrôle « est-ce un administrateur » vit en base, dans les fonctions
 * appelées ici. Ni le secret ni la clé ne ressortent jamais : on ne répond
 * que par leur présence.
 */
const schema = z.object({
  champ: z.enum(['secret', 'cle']),
  valeur: z.string().min(10).max(400),
});

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: false }, { status: 503 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Valeur invalide.' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data, error } =
    parsed.data.champ === 'secret'
      ? await supabase.rpc('admin_set_whop_secret', { p_secret: parsed.data.valeur })
      : await supabase.rpc('admin_set_whop_api_key', { p_key: parsed.data.valeur });

  if (error) {
    const interdit = error.code === '42501' || error.message.includes('administrateur');
    return NextResponse.json({ ok: false }, { status: interdit ? 403 : 500 });
  }

  return NextResponse.json({ ok: data === true });
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ configured: false }, { status: 503 });

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('admin_whop_status');

  if (error) return NextResponse.json({ configured: false }, { status: 403 });

  const row = (Array.isArray(data) ? data[0] : data) as
    | { secret_pose: boolean; cle_api_posee: boolean }
    | undefined;

  const etat = {
    secret: Boolean(row?.secret_pose),
    cleApi: Boolean(row?.cle_api_posee),
  };

  // Test réel de la connexion, seulement s'il est demandé : c'est un appel
  // sortant, il n'a pas à partir à chaque affichage de la page.
  if (request.nextUrl.searchParams.get('test') !== '1') {
    return NextResponse.json(etat);
  }

  const rows = await listValidMemberships(true);
  return NextResponse.json({
    ...etat,
    test:
      rows === null
        ? { ok: false, message: 'Whop n’a pas répondu, ou la clé est refusée.' }
        : { ok: true, abonnements: rows.length },
  });
}
