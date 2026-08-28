import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env, required } from '@/lib/env';

/** Client serveur lié à la session utilisateur (RLS appliquée). */
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

/** Client service-role : contourne la RLS. Réservé aux routes serveur et aux crons. */
export function createAdminSupabase() {
  return createSupabaseClient(
    required('NEXT_PUBLIC_SUPABASE_URL'),
    required('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Utilisateur courant, ou null. Toujours vérifié côté serveur. */
export async function getSessionUser() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
