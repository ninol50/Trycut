import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { env, isStripeConfigured, isSupabaseConfigured } from '@/lib/env';
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
    aiProvider: env.aiProvider,
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

  // --- Stripe : liens publics présents, secrets pour créditer -------------
  checks['stripe'] = {
    paymentLinks: true,
    secretKey: isStripeConfigured,
    webhookSecret: Boolean(env.stripeWebhookSecret),
    /** Sans ces deux-là, un paiement encaisse mais ne crédite pas le compte. */
    creditsOnPurchase: isStripeConfigured && Boolean(env.stripeWebhookSecret),
  };

  // --- Emails --------------------------------------------------------------
  checks['email'] = {
    resendKey: Boolean(env.resendApiKey),
    from: env.emailFrom,
  };

  checks['posthog'] = { configured: Boolean(env.posthogKey), host: env.posthogHost };

  // La clé service_role ne sert qu'au cron de purge et au stockage d'un
  // résultat produit par un provider réel.
  checks['serviceRole'] = {
    present: Boolean(env.supabaseServiceRoleKey),
    requiredFor: ['cron de purge J+30', 'stockage du rendu avec AI_PROVIDER=fal'],
  };

  return NextResponse.json(checks, { headers: { 'cache-control': 'no-store' } });
}
