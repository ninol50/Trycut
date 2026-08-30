/**
 * Accès centralisé aux variables d'environnement.
 * Rien ne jette au chargement du module : le MVP doit démarrer avec un .env partiel
 * (mode mock) et n'échouer que là où la variable est réellement nécessaire.
 */

import { publicEnv } from '@/lib/public-env';

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function required(name: string): string {
  const value = optional(name);
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

function int(name: string, fallback: number): number {
  const raw = optional(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = optional(name);
  if (!raw) return fallback;
  return raw === 'true' || raw === '1';
}

/**
 * Côté serveur, Vercel expose les mêmes hôtes sans le préfixe public.
 * L'URL de production est stable ; VERCEL_URL change à chaque déploiement.
 */
const stableHost = optional('VERCEL_PROJECT_PRODUCTION_URL');
const serverVercelHost = optional('VERCEL_URL');

export const env = {
  siteUrl:
    optional('NEXT_PUBLIC_SITE_URL') ??
    (stableHost ? `https://${stableHost}` : undefined) ??
    (serverVercelHost ? `https://${serverVercelHost}` : undefined) ??
    publicEnv.siteUrl,

  supabaseUrl: publicEnv.supabaseUrl || undefined,
  supabaseAnonKey: publicEnv.supabaseAnonKey || undefined,
  supabaseServiceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY'),

  aiProvider: (optional('AI_PROVIDER') ?? 'mock') as 'mock' | 'fal',
  falKey: optional('FAL_KEY'),
  aiWebhookSecret: optional('AI_WEBHOOK_SECRET') ?? 'dev-ai-webhook-secret',

  /** Secret de signature du webhook Whop, fourni préfixé `whsec_`. */
  whopWebhookSecret: optional('WHOP_WEBHOOK_SECRET'),

  resendApiKey: optional('RESEND_API_KEY'),
  /**
   * Expéditeur par défaut : l'adresse partagée de Resend, qui fonctionne sans
   * domaine vérifié mais n'atteint que l'adresse du titulaire du compte.
   * À remplacer par une adresse du domaine une fois celui-ci vérifié.
   */
  emailFrom: optional('EMAIL_FROM') ?? 'Trycut <onboarding@resend.dev>',

  posthogKey: publicEnv.posthogKey || undefined,
  posthogHost: publicEnv.posthogHost,

  cronSecret: optional('CRON_SECRET'),
  anonTokenSecret: optional('ANON_TOKEN_SECRET') ?? 'dev-anon-token-secret',

  // Plafonds de dépense (section 7.4)
  dailyGenerationCap: int('DAILY_GENERATION_CAP', 15),
  monthlySpendCapCents: int('MONTHLY_SPEND_CAP_CENTS', 1800),
  costPerGenerationCents: int('COST_PER_GENERATION_CENTS', 4),

  // Feature flags
  onboardingLength: publicEnv.onboardingLength,
  /**
   * L'offre gratuite donne 0 coupe : l'essai anonyme est donc coupé par défaut.
   * Le remettre à true rouvre une génération offerte sans compte, sans autre
   * changement de code.
   */
  enableFreeTrial: bool('ENABLE_FREE_TRIAL', false),
} as const;

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
