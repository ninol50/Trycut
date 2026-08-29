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
/**
 * Vercel définit ses variables même vides. `??` ne les rattrape donc pas :
 * partout ici on utilise `||`, sinon une variable vide écrase la valeur par
 * défaut. C'est ce qui avait mis `api_host: ""` sur PostHog en production.
 *
 * `VERCEL_PROJECT_PRODUCTION_URL` est stable d'un déploiement à l'autre, à la
 * différence de `VERCEL_URL` qui change à chaque build — les liens de
 * confirmation d'email doivent viser une URL déclarée chez Supabase.
 */
const stableHost = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || '';
const vercelHost = process.env.NEXT_PUBLIC_VERCEL_URL || '';

/** Domaine de production. Surchargé par NEXT_PUBLIC_SITE_URL si besoin. */
const DEFAULT_SITE_URL =
  process.env.NODE_ENV === 'production' ? 'https://trycutapps.site' : 'http://localhost:3000';

const DEFAULT_SUPABASE_URL = 'https://otgqqrrbanuyiqfspsrm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90Z3FxcnJiYW51eWlxZnNwc3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3ODY0NTQsImV4cCI6MjEwMzM2MjQ1NH0.4AD-I3lER0coofb8ckAXzj_YIckSyN9cpijHRvm8mKY';

export const publicEnv = {
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (stableHost ? `https://${stableHost}` : '') ||
    (vercelHost ? `https://${vercelHost}` : '') ||
    DEFAULT_SITE_URL,
  /**
   * Projet Supabase par défaut. L'URL et la clé « anon » sont publiques par
   * conception : elles partent dans le navigateur de chaque visiteur, et tout
   * ce qu'elles autorisent est décidé par la RLS, pas par leur secret.
   * Les variables d'environnement restent prioritaires.
   */
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  posthogKey:
    process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    'phc_xVtzU2fWPFv6r924D6Go3EpQhEPgirGvcSDZDjBNSZy4',
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
  /**
   * `none` (défaut) : pas de questionnaire, on va droit à l'import photo.
   * `short` / `full` restent servis pour comparer les parcours par la donnée.
   */
  onboardingLength: (process.env.NEXT_PUBLIC_ONBOARDING_LENGTH === 'short'
    ? 'short'
    : process.env.NEXT_PUBLIC_ONBOARDING_LENGTH === 'full'
      ? 'full'
      : 'none') as 'none' | 'short' | 'full',
  stripeLinkPack: process.env.NEXT_PUBLIC_STRIPE_LINK_PACK || '',
  stripeLinkPass: process.env.NEXT_PUBLIC_STRIPE_LINK_PASS || '',
} as const;
