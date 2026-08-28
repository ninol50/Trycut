import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { readGuestId } from '@/lib/guest';
import { siteUrl } from '@/lib/env';

export const runtime = 'nodejs';

/**
 * Retour de vérification d'email.
 *
 * C'est ici — et seulement ici — que le crédit offert est accordé :
 * `grant_signup_bonus` vérifie `email_confirmed_at` et ne peut créditer
 * qu'une fois par compte.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('suite') ?? '/app';

  if (!code) {
    return NextResponse.redirect(`${siteUrl()}/connexion?erreur=lien_invalide`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${siteUrl()}/connexion?erreur=lien_expire`);
  }

  try {
    const admin = createAdminClient();
    await admin.rpc('grant_signup_bonus', { p_user_id: data.user.id });

    const guestId = await readGuestId();
    if (guestId) {
      await admin.rpc('claim_guest_generations', {
        p_user_id: data.user.id,
        p_guest_id: guestId,
      });
    }
  } catch (error) {
    console.error('[auth/callback] attribution du crédit impossible', error);
  }

  return NextResponse.redirect(`${siteUrl()}${next.startsWith('/') ? next : '/app'}`);
}
