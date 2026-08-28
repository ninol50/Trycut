# Trycut — conventions de code

Essai virtuel de coupes, colorations et accessoires. Web app mobile-first (Next.js 15,
App Router), marché français, cible technique **390 px de viewport**.

## Règles non négociables

1. **Aucun appel IA synchrone dans une route serverless.** Le pipeline est asynchrone :
   `POST /api/generations` réserve, débite et rend la main ; le provider rappelle
   `/api/webhooks/ai`.
2. **Aucun décompte de crédit côté client.** Tout passe par les fonctions Postgres
   `consume_credit` / `refund_credit` / `grant_credits`.
3. **Plafonds de dépense obligatoires** (`DAILY_GENERATION_CAP`, `MONTHLY_SPEND_CAP_CENTS`).
   Le mensuel est vérifié avant le journalier. Un refus ne débite jamais de crédit.
4. **Aucun prompt libre.** Le client envoie un `catalogItemId`, rien d'autre. Le
   `prompt_template` est interpolé côté serveur (`lib/ai/prompt.ts`).
5. **Aucun nom de marque déposée** dans le catalogue, les prompts ou l'UI.
6. `strict: true` + `noUncheckedIndexedAccess`. **Zéro `any`.** ESLint bloquant.

## Direction artistique

- Fond **blanc pur dominant**. Le violet est un accent, jamais un fond de page. Seules
  exceptions : le bloc CTA final de la landing et les cartes de catalogue sélectionnées.
- **Un seul dégradé**, réservé aux CTA principaux : `bg-cta-gradient`. Interdit ailleurs.
- Ombres violettes (`shadow-violet`), jamais grises. `rounded-2xl` sur les cards,
  `rounded-full` sur les boutons.
- Échelle typographique : `48/32/24/18/16/14`. **Sentence case partout**, jamais de
  majuscules.
- Le catalogue est le seul endroit à densité visuelle élevée. Tout le reste respire.

## Motion

Passe toujours par `components/motion.ts` (`useEntrance`, `useInView`, `useTapScale`) :
ces hooks gèrent `prefers-reduced-motion`, qui doit faire tomber **toute** animation à un
simple fade d'opacité. Easing standard `[0.16, 1, 0.3, 1]`. Jamais de scale ni de rotation
à l'entrée. `whileTap={{ scale: 0.97 }}` sur tous les boutons.

## Frontières serveur / client

- Les variables exposées au navigateur passent par `lib/public-env.ts`, en accès
  **statique** `process.env.NEXT_PUBLIC_X`. Next n'inline pas `process.env[nom]` côté
  client — un accès dynamique donne une valeur vide en production.
- `lib/env.ts` est le point d'entrée serveur. Il ne jette jamais au chargement : le MVP
  doit démarrer avec un `.env` partiel.
- **Aucune fonction ne traverse la frontière serveur → client** en prop. Passer une route
  sous forme de chaîne (`nextBasePath`), pas de callback.
- Toute route protégée vérifie la session **dans un layout server component**. Aucun
  contenu premium rendu côté client avant vérification.

## Base de données

- Migrations versionnées dans `supabase/migrations/`, **rejouables** (`if not exists`,
  `create or replace`, upsert sur le slug).
- Postgres accorde `EXECUTE` à `PUBLIC` par défaut : toute fonction `security definer`
  doit être révoquée **sur `public`**, pas seulement sur `anon`/`authenticated`.
- Le catalogue a une seule source de vérité : `lib/catalog.json`. Le seed SQL est
  généré (`node scripts/generate-seed.mjs`), ne pas l'éditer à la main.
- Aucun bucket public. Tout accès fichier passe par une URL signée 60 s émise après
  vérification serveur de la propriété de la ligne.

## Interface

Quatre états, aucun optionnel : **vide**, **chargement**, **rempli**, **erreur**. Jamais de
spinner nu, jamais d'écran blanc. Les messages d'erreur sont fixés dans
`components/generation/ErrorState.tsx` — ne pas les reformuler au cas par cas.

Tap targets 48 px minimum, aucun scroll horizontal, focus clavier visible.
