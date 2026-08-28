import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types/db';

/**
 * Client serveur lié aux cookies de session.
 * À utiliser dans les server components, layouts et route handlers.
 */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
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
            // Appelé depuis un server component : le middleware rafraîchit la
            // session, on peut ignorer sans risque.
          }
        },
      },
    },
  );
}

/** Utilisateur authentifié, ou null. Toujours vérifié côté serveur. */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export interface SessionContext {
  user: User;
  profile: Profile;
  supabase: SupabaseClient;
}

/**
 * Session + profil. Renvoie null si non connecté ou profil introuvable.
 * Les layouts protégés s'appuient dessus avant tout rendu.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>();

  if (!profile) return null;
  return { user, profile, supabase };
}
