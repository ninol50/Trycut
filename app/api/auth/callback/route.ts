import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { sendEmail } from '@/lib/email';

/**
 * Callback de vérification d'email.
 * Le bonus d'inscription (1 crédit) est accordé ICI, après vérification,
 * jamais à la création du compte. L'index unique sur `credit_ledger`
 * garantit qu'il n'est accordé qu'une fois.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/app';

  if (!isSupabaseConfigured || !code) {
    return NextResponse.redirect(new URL('/connexion?erreur=lien', url.origin));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/connexion?erreur=lien', url.origin));
  }

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (user?.email_confirmed_at) {
    try {
      const admin = createAdminSupabase();
      const { data: granted } = await admin.rpc('grant_credits', {
        p_user_id: user.id,
        p_amount: 1,
        p_reason: 'signup_bonus',
      });

      if (typeof granted === 'number' && user.email) {
        await sendEmail({
          to: user.email,
          subject: 'Ton crédit offert est actif',
          html: '<p>Ton email est vérifié. Un essai t’attend dans ton espace.</p>',
        });
      }
    } catch (bonusError) {
      // Le bonus ne doit jamais bloquer la connexion.
      console.error('[auth/callback] bonus', bonusError);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
