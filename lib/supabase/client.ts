'use client';

import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/public-env';

/** Client navigateur. Ne doit jamais servir à lire du contenu premium sans vérif serveur. */
export function createClient() {
  return createBrowserClient(
    publicEnv.supabaseUrl || 'http://localhost:54321',
    publicEnv.supabaseAnonKey || 'anon-key-absente',
  );
}
