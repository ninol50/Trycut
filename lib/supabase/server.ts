import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env, required } from '@/lib/env';

/**
 * Client serveur lié à la session utilisateur. **C'est le client par défaut.**
 * La RLS s'applique : ce que la base refuse, l'app ne peut pas le contourner.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    env.supabaseUrl ?? 'http://localhost:54321',
    env.supabaseAnonKey ?? 'anon-key-absente',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Appelé depuis un Server Component : le middleware rafraîchit déjà la session.
          }
        },
      },
    },
  );
}

/**
 * Client sans session, pour les rappels de provider qui prouvent leur droit
 * autrement (secret par ligne). N'a aucun privilège particulier.
 */
export function createAnonSupabase() {
  return createSupabaseClient(
    required('NEXT_PUBLIC_SUPABASE_URL'),
    required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Client service-role : contourne la RLS. Réservé à ce qui ne peut pas s'en
 * passer — le cron de purge et l'octroi de crédits après paiement Stripe.
 * Absent en développement, les appelants doivent gérer le null.
 */
export function createAdminSupabase() {
  if (!env.supabaseServiceRoleKey || !env.supabaseUrl) return null;

  return createSupabaseClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Utilisateur courant, ou null. Toujours vérifié côté serveur. */
export async function getSessionUser() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
