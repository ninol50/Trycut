import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { sendWelcomeEmail } from '@/lib/email';

/**
 * Callback de vérification d'email. Aucun crédit n'est accordé ici :
 * l'offre gratuite ne donne aucune coupe, les coupes viennent de l'abonnement.
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

  if (user?.email) {
    const firstName =
      typeof user.user_metadata?.['first_name'] === 'string'
        ? (user.user_metadata['first_name'] as string)
        : null;
    // L'email de bienvenue ne doit jamais bloquer la connexion.
    void sendWelcomeEmail(user.email, firstName).catch(() => undefined);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
