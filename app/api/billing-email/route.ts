import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const runtime = 'nodejs';

/**
 * Retient l'adresse avec laquelle la personne s'apprête à payer.
 *
 * C'est elle qui rattachera le paiement au compte. Le contrôle « chacun ne
 * fixe que la sienne » vit dans `set_billing_email`, en base.
 */
const schema = z.object({ email: z.string().email().max(200) });

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: false }, { status: 503 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Adresse invalide.' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('set_billing_email', { p_email: parsed.data.email });

  if (error) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: data === true });
}
