import { createAdminSupabase } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export interface StripeConfig {
  secretKey: string | null;
  webhookSecret: string | null;
  pricePack: string | null;
  pricePass: string | null;
  priceTrimestre: string | null;
}

interface Ligne {
  stripe_secret_key: string | null;
  stripe_webhook_secret: string | null;
  stripe_price_pack: string | null;
  stripe_price_pass: string | null;
  stripe_price_trimestre: string | null;
}

function nonVide(valeur: string | null | undefined): string | null {
  return typeof valeur === 'string' && valeur.trim().length > 0 ? valeur.trim() : null;
}

/**
 * Réglages Stripe, dans cet ordre : variable d'environnement, puis base.
 *
 * La variable reste prioritaire — c'est la voie normale d'un déploiement. La
 * base existe pour le cas réel : le propriétaire travaille depuis un
 * téléphone, et une variable posée chez l'hébergeur peut ne jamais atteindre
 * le serveur sans qu'aucun écran ne le signale.
 *
 * Chaque champ est résolu séparément : une clé posée en variable et un secret
 * de webhook posé en base est une combinaison valide.
 */
export async function resolveStripeConfig(): Promise<StripeConfig> {
  const depuisEnv: StripeConfig = {
    secretKey: nonVide(env.stripeSecretKey),
    webhookSecret: nonVide(env.stripeWebhookSecret),
    pricePack: nonVide(env.stripePricePack),
    pricePass: nonVide(env.stripePricePass),
    priceTrimestre: nonVide(process.env.STRIPE_PRICE_TRIMESTRE),
  };

  // Tout est déjà là : inutile d'aller en base à chaque requête.
  if (
    depuisEnv.secretKey &&
    depuisEnv.webhookSecret &&
    depuisEnv.pricePack &&
    depuisEnv.pricePass &&
    depuisEnv.priceTrimestre
  ) {
    return depuisEnv;
  }

  const admin = createAdminSupabase();
  if (!admin) return depuisEnv;

  const { data, error } = await admin
    .from('app_config')
    .select(
      'stripe_secret_key, stripe_webhook_secret, stripe_price_pack, stripe_price_pass, stripe_price_trimestre',
    )
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('[stripe] lecture des réglages', error.message);
    return depuisEnv;
  }

  const ligne = data as Ligne | null;
  if (!ligne) return depuisEnv;

  return {
    secretKey: depuisEnv.secretKey ?? nonVide(ligne.stripe_secret_key),
    webhookSecret: depuisEnv.webhookSecret ?? nonVide(ligne.stripe_webhook_secret),
    pricePack: depuisEnv.pricePack ?? nonVide(ligne.stripe_price_pack),
    pricePass: depuisEnv.pricePass ?? nonVide(ligne.stripe_price_pass),
    priceTrimestre: depuisEnv.priceTrimestre ?? nonVide(ligne.stripe_price_trimestre),
  };
}

/**
 * Encaisser depuis le site demande la clé et les tarifs. Les liens de paiement
 * fonctionnent sans rien de tout ça — mais ils n'accordent aucune coupe tant
 * que le webhook n'est pas signé.
 */
export function peutEncaisser(config: StripeConfig): boolean {
  return Boolean(
    config.secretKey && config.pricePack && config.pricePass && config.priceTrimestre,
  );
}

/**
 * Créditer après paiement demande en plus le webhook et le service_role :
 * sans eux, l'argent rentre et le compte reste vide.
 */
export function crediteApresPaiement(config: StripeConfig): boolean {
  return (
    Boolean(config.secretKey) &&
    Boolean(config.webhookSecret) &&
    Boolean(env.supabaseServiceRoleKey)
  );
}
