'use client';

import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

/** Client navigateur. Ne doit jamais servir à lire du contenu premium sans vérif serveur. */
export function createClient() {
  return createBrowserClient(
    env.supabaseUrl ?? 'http://localhost:54321',
    env.supabaseAnonKey ?? 'anon-key-absente',
  );
}
