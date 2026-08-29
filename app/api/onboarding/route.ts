import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabase, getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const runtime = 'nodejs';

/**
 * Persiste les réponses d'onboarding (localStorage) au moment où le compte
 * existe. Le prénom remonte aussi dans `profiles`.
 */
const schema = z.object({
  answers: z.record(z.string().max(40), z.union([z.string().max(80), z.array(z.string().max(80)).max(10)])),
});

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { answers } = parsed.data;
  const supabase = await createServerSupabase();

  const { data: existing } = await supabase
    .from('onboarding_responses')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('onboarding_responses')
      .update({ answers, completed_at: new Date().toISOString() })
      .eq('id', (existing as { id: string }).id);
  } else {
    await supabase
      .from('onboarding_responses')
      .insert({ user_id: user.id, answers, completed_at: new Date().toISOString() });
  }

  const firstName = answers['first_name'];
  if (typeof firstName === 'string' && firstName.length > 0) {
    await supabase.from('profiles').update({ first_name: firstName }).eq('id', user.id);
  }

  return NextResponse.json({ ok: true });
}
