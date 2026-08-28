import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireEnv } from '@/lib/env';

let cached: SupabaseClient | null = null;

/**
 * Client service_role — contourne le RLS.
 *
 * Réservé aux webhooks (Stripe, IA), au cron de purge et aux écritures de
 * crédits. Ne jamais l'importer depuis un composant client : le module
 * lèverait de toute façon, la clé n'étant pas exposée au bundle navigateur.
 */
export function createAdminClient(): SupabaseClient {
  if (cached) return cached;
  cached = createSupabaseClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return cached;
}
