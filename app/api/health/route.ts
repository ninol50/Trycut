import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { env, isWhopConfigured, isSupabaseConfigured } from '@/lib/env';
import { loadCatalogWithSource } from '@/lib/catalog-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * État des intégrations. Ne renvoie que des booléens et des compteurs —
 * jamais une clé, jamais une donnée utilisateur. Sert à vérifier un
 * déploiement sans ouvrir six onglets.
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    siteUrl: env.siteUrl,
    // `AI_PROVIDER=fal` sans clé ne rate pas au démarrage : il rate à la
    // première coupe. Autant le voir ici.
    ai: {
      provider: env.aiProvider,
      falKey: Boolean(env.falKey),
      webhookSecret: env.aiWebhookSecret !== 'dev-ai-webhook-secret',
      readyForRealCuts: env.aiProvider === 'fal' && Boolean(env.falKey),
    },
  };

  // --- Supabase : joignable, catalogue seedé, fonctions en place ----------
  if (!isSupabaseConfigured) {
    checks['supabase'] = { configured: false };
  } else {
    try {
      const supabase = await createServerSupabase();

      const { count, error: catalogError } = await supabase
        .from('catalog_items')
        .select('id', { count: 'exact', head: true });

      const { error: rpcError } = await supabase.rpc('count_cuts_today');

      checks['supabase'] = {
        configured: true,
        reachable: !catalogError,
        catalogItems: count ?? 0,
        rpcReady: !rpcError,
        error: catalogError?.message ?? rpcError?.message ?? null,
      };
    } catch (error) {
      checks['supabase'] = {
        configured: true,
        reachable: false,
        error: error instanceof Error ? error.message : 'inconnu',
      };
    }
  }

  // Le catalogue doit venir de Supabase : les identifiants du repli sont des
  // slugs, alors que POST /api/generations exige des UUID. Un repli silencieux
  // rend donc la génération impossible.
  const catalog = await loadCatalogWithSource();
  checks['catalog'] = {
    source: catalog.source,
    count: catalog.items.length,
    firstId: catalog.items[0]?.id ?? null,
    error: catalog.error,
  };

  // --- Whop : le webhook est ce qui crédite après paiement ----------------
  // Créditer un compte se fait avec la clé service_role : la session d'un
  // client ne peut pas s'octroyer des crédits. Sans elle, le webhook répond
  // 503 même avec le secret Whop — l'annoncer prêt serait faux.
  checks['whop'] = {
    paymentLinks: true,
    webhookSecret: isWhopConfigured,
    serviceRoleKey: Boolean(env.supabaseServiceRoleKey),
    /** Sans ces deux-là, un paiement encaisse mais ne crédite pas le compte. */
    creditsOnPurchase: isWhopConfigured && Boolean(env.supabaseServiceRoleKey),
  };

  // --- Emails --------------------------------------------------------------
  checks['email'] = {
    resendKey: Boolean(env.resendApiKey),
    from: env.emailFrom,
  };

  checks['posthog'] = { configured: Boolean(env.posthogKey), host: env.posthogHost };

  checks['serviceRole'] = {
    present: Boolean(env.supabaseServiceRoleKey),
    requiredFor: [
      'créditer un compte après paiement (webhook Whop)',
      'cron de purge J+30',
      'stockage du rendu avec AI_PROVIDER=fal',
    ],
  };

  return NextResponse.json(checks, { headers: { 'cache-control': 'no-store' } });
}
