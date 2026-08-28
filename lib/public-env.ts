/**
 * Variables exposées au navigateur.
 * Elles DOIVENT être lues en accès statique `process.env.NEXT_PUBLIC_X` :
 * Next.js n'inline pas les accès dynamiques `process.env[nom]` côté client.
 */
export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '',
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
  onboardingLength: (process.env.NEXT_PUBLIC_ONBOARDING_LENGTH === 'short'
    ? 'short'
    : 'full') as 'full' | 'short',
} as const;
