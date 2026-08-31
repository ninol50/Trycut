import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { env, isSupabaseConfigured } from '@/lib/env';
import { resolveStripeConfig, crediteApresPaiement } from '@/lib/stripe-config';
import { loadCatalogWithSource } from '@/lib/catalog-server';
import { PRICING } from '@/lib/pricing';

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

  // --- Stripe : le webhook est ce qui crédite après paiement ---------------
  // Créditer un compte se fait avec la clé service_role : la session d'un
  // client ne peut pas s'octroyer des crédits. Sans elle, le webhook répond
  // 503 même avec les deux secrets — l'annoncer prêt serait faux.
  // Les réglages Stripe peuvent venir de l'environnement ou de la base : c'est
  // l'état résolu qui compte, pas la seule variable.
  const stripe = await resolveStripeConfig();
  checks['stripe'] = {
    paymentLinks: PRICING.filter((plan) => Boolean(plan.paymentLink)).length,
    secretKey: Boolean(stripe.secretKey),
    modeTest: stripe.secretKey?.startsWith('sk_test_') ?? false,
    webhookSecret: Boolean(stripe.webhookSecret),
    serviceRoleKey: Boolean(env.supabaseServiceRoleKey),
    /** Sans ces trois-là, un paiement encaisse mais ne crédite pas le compte. */
    creditsOnPurchase: crediteApresPaiement(stripe),
  };

  // --- Emails --------------------------------------------------------------
  checks['email'] = {
    resendKey: Boolean(env.resendApiKey),
    from: env.emailFrom,
  };

  checks['posthog'] = { configured: Boolean(env.posthogKey), host: env.posthogHost };

  // --- Diagnostic de configuration -----------------------------------------
  // Quand une variable apparaît dans Vercel mais que le site ne la voit pas,
  // seule la liste des noms réellement reçus par le serveur permet de trancher.
  // Uniquement les noms : une valeur exposée ici serait publique.
  const attendues = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_PACK',
    'STRIPE_PRICE_PASS',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'CRON_SECRET',
    'FAL_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ] as const;

  checks['variables'] = {
    recues: attendues.filter((nom) => {
      const valeur = process.env[nom];
      return typeof valeur === 'string' && valeur.trim().length > 0;
    }),
    videsOuAbsentes: attendues.filter((nom) => {
      const valeur = process.env[nom];
      return !(typeof valeur === 'string' && valeur.trim().length > 0);
    }),
  };

  checks['serviceRole'] = {
    present: Boolean(env.supabaseServiceRoleKey),
    requiredFor: [
      'créditer un compte après paiement (webhook Stripe)',
      'cron de purge J+30',
      'stockage du rendu avec AI_PROVIDER=fal',
    ],
  };

  return NextResponse.json(checks, { headers: { 'cache-control': 'no-store' } });
}
