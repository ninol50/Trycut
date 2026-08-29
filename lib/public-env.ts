/**
 * Variables exposées au navigateur.
 * Elles DOIVENT être lues en accès statique `process.env.NEXT_PUBLIC_X` :
 * Next.js n'inline pas les accès dynamiques `process.env[nom]` côté client.
 */
/**
 * Vercel expose l'hôte du déploiement. Sans `NEXT_PUBLIC_SITE_URL`, on s'en sert :
 * sinon les URL de rappel (webhook IA, redirection d'auth) pointeraient sur
 * localhost en production.
 */
const vercelHost = process.env.NEXT_PUBLIC_VERCEL_URL ?? '';

export const publicEnv = {
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (vercelHost ? `https://${vercelHost}` : 'http://localhost:3000'),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '',
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
  /**
   * `none` (défaut) : pas de questionnaire, on va droit à l'import photo.
   * `short` / `full` restent servis pour comparer les parcours par la donnée.
   */
  onboardingLength: (process.env.NEXT_PUBLIC_ONBOARDING_LENGTH === 'short'
    ? 'short'
    : process.env.NEXT_PUBLIC_ONBOARDING_LENGTH === 'full'
      ? 'full'
      : 'none') as 'none' | 'short' | 'full',
  stripeLinkPack: process.env.NEXT_PUBLIC_STRIPE_LINK_PACK ?? '',
  stripeLinkPass: process.env.NEXT_PUBLIC_STRIPE_LINK_PASS ?? '',
} as const;
