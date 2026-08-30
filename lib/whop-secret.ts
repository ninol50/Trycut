import { createAdminSupabase } from '@/lib/supabase/server';
import { env } from '@/lib/env';

/**
 * Secret de signature du webhook Whop.
 *
 * Deux sources, dans cet ordre : la variable d'environnement, puis la base.
 *
 * La variable reste la voie normale. La base existe parce que le tableau de
 * bord de l'hébergeur est inutilisable depuis un téléphone : le propriétaire
 * peut poser le secret depuis la page admin de son propre site, sans
 * redéploiement. `app_config` n'est accessible qu'au service_role et la RLS y
 * est active — le secret y est aussi protégé que dans une variable.
 */
export async function resolveWhopSecret(): Promise<string | null> {
  if (env.whopWebhookSecret) return env.whopWebhookSecret;

  const admin = createAdminSupabase();
  if (!admin) return null;

  const { data, error } = await admin
    .from('app_config')
    .select('whop_webhook_secret')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('[whop] lecture du secret', error.message);
    return null;
  }

  const secret = (data as { whop_webhook_secret: string | null } | null)?.whop_webhook_secret;
  return secret && secret.length > 0 ? secret : null;
}
