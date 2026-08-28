/**
 * Accès centralisé aux variables d'environnement.
 * Rien ne jette au chargement du module : le MVP doit démarrer avec un .env partiel
 * (mode mock) et n'échouer que là où la variable est réellement nécessaire.
 */

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

export const env = {
  siteUrl: optional('NEXT_PUBLIC_SITE_URL') ?? 'http://localhost:3000',

  supabaseUrl: optional('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: optional('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY'),

  aiProvider: (optional('AI_PROVIDER') ?? 'mock') as 'mock' | 'fal',
  falKey: optional('FAL_KEY'),
  aiWebhookSecret: optional('AI_WEBHOOK_SECRET') ?? 'dev-ai-webhook-secret',

  stripeSecretKey: optional('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: optional('STRIPE_WEBHOOK_SECRET'),
  stripePricePack: optional('STRIPE_PRICE_PACK'),
  stripePricePass: optional('STRIPE_PRICE_PASS'),
  stripePricePackOneshot: optional('STRIPE_PRICE_PACK_ONESHOT'),

  resendApiKey: optional('RESEND_API_KEY'),
  emailFrom: optional('EMAIL_FROM') ?? 'Trycut <onboarding@trycut.local>',

  posthogKey: optional('NEXT_PUBLIC_POSTHOG_KEY'),
  posthogHost: optional('NEXT_PUBLIC_POSTHOG_HOST') ?? 'https://eu.i.posthog.com',

  cronSecret: optional('CRON_SECRET'),
  anonTokenSecret: optional('ANON_TOKEN_SECRET') ?? 'dev-anon-token-secret',

  // Plafonds de dépense (section 7.4)
  dailyGenerationCap: int('DAILY_GENERATION_CAP', 15),
  monthlySpendCapCents: int('MONTHLY_SPEND_CAP_CENTS', 1800),
  costPerGenerationCents: int('COST_PER_GENERATION_CENTS', 4),

  // Feature flags
  onboardingLength: (optional('NEXT_PUBLIC_ONBOARDING_LENGTH') ?? 'full') as 'full' | 'short',
  enableOneTimePack: bool('ENABLE_ONE_TIME_PACK', false),
} as const;

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isStripeConfigured = Boolean(env.stripeSecretKey);
