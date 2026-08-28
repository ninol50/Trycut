/**
 * Accès centralisé aux variables d'environnement.
 *
 * Deux règles :
 *  - `requireEnv` lève à l'appel (pas à l'import), pour qu'un build Vercel sans
 *    secrets Stripe ne casse pas les pages qui n'en ont pas besoin ;
 *  - tout ce qui n'est pas préfixé NEXT_PUBLIC_ n'est lu que côté serveur.
 */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. Voir .env.example et le README.`,
    );
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Garde-fous de dépense — section 7.4 du brief. */
export const spendLimits = {
  get dailyGenerationCap(): number {
    return intEnv('DAILY_GENERATION_CAP', 40);
  },
  get estimatedCostCentsPerGeneration(): number {
    return intEnv('ESTIMATED_COST_CENTS_PER_GENERATION', 4);
  },
  get userHourlyLimit(): number {
    return intEnv('USER_HOURLY_GENERATION_LIMIT', 5);
  },
  get ipFreeLimit(): number {
    return intEnv('IP_FREE_GENERATION_LIMIT', 3);
  },
};

export function siteUrl(): string {
  const explicit = optionalEnv('NEXT_PUBLIC_SITE_URL');
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = optionalEnv('VERCEL_URL');
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export const AI_PROVIDER = (process.env.AI_PROVIDER ?? 'mock') as 'mock' | 'fal';
