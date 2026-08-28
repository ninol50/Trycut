# Conventions du projet

Web app mobile-first d'essai virtuel de coupe. Next.js 15 (App Router),
TypeScript strict, Tailwind, Framer Motion, Supabase, Stripe.

## Les six règles qui ne se négocient pas

1. **Mobile-first, viewport 390 px.** Tout se conçoit à cette largeur d'abord.
   Aucun scroll horizontal, cibles tactiles ≥ 48 px (`min-h-tap`).
2. **Aucun appel IA synchrone dans une route serverless.** `POST
   /api/generations` rend la main immédiatement ; le résultat arrive par
   webhook. Toute tentative d'`await` sur une génération est un bug.
3. **Aucun décompte de crédit côté client.** Les crédits ne bougent que dans
   les fonctions Postgres de `supabase/migrations/0002_functions.sql`.
4. **Le plafond de dépense est obligatoire.** `DAILY_GENERATION_CAP` est
   appliqué en base, dans la même transaction que le débit. Le budget
   d'inférence est inférieur à 20 €/mois : sans ce garde-fou, une journée de
   trafic TikTok le consomme entièrement.
5. **Aucun nom de marque déposée** dans le catalogue, les prompts ou l'UI.
   Descriptions génériques uniquement.
6. **`strict: true` + `noUncheckedIndexedAccess`, zéro `any`, ESLint bloquant.**

## Où vit quoi

```
src/app/                pages et routes API (App Router)
src/components/         composants ; `ui/` = primitives
src/lib/                logique métier, sans JSX
  ai/                   fournisseur IA (provider.ts = point d'entrée unique)
  supabase/             client.ts (navigateur) · server.ts (session) · admin.ts (service_role)
  catalog.ts            filtrage du catalogue — pur, testable
  onboarding.ts         définition des 13 écrans, source de vérité unique
supabase/migrations/    SQL versionné et rejouable
```

## Frontières à ne pas franchir

- **`lib/supabase/admin.ts` ne s'importe jamais depuis un composant client.**
  Il porte la clé `service_role`, qui contourne le RLS.
- **`prompt_template` ne quitte pas le serveur.** Les requêtes catalogue
  listent leurs colonnes explicitement (`CATALOG_PUBLIC_COLUMNS`), et un
  privilège de colonne l'interdit aussi côté base. Le client n'envoie qu'un
  `catalogItemId`.
- **`lib/stripe.ts` est serveur uniquement.** Les libellés d'offres vivent
  dans `lib/offers.ts` : importer `lib/stripe.ts` depuis un composant client
  embarque tout le SDK Stripe dans le bundle.
- **Aucun accès direct au Storage.** Les buckets sont privés ; on passe par
  une URL signée 60 s, générée après vérification serveur de la propriété de
  la ligne.

## Direction artistique

Palette, typographie et motion sont décrits dans `src/app/globals.css` et
`tailwind.config.ts` — ce sont les deux seuls endroits où les valeurs vivent.

- Fond **blanc dominant**. Le violet est un accent. Deux exceptions au fond
  coloré : le bloc CTA final de la landing, et les cartes de catalogue
  sélectionnées.
- **Un seul dégradé**, `linear-gradient(135deg, #7C3AED, #A78BFA)`, réservé
  aux CTA principaux (classe `.btn-primary`). Interdit ailleurs.
- Ombres violettes, jamais grises. `rounded-2xl` sur les cards,
  `rounded-full` sur les boutons.
- Sentence case partout, jamais de majuscules décoratives.

### Motion

Tout passe par `src/lib/motion.ts`. Le mouvement est orchestré, pas éparpillé.
Chaque helper renvoie une variante « fade seul » quand
`prefers-reduced-motion` est actif — **c'est obligatoire, pas optionnel**.

- Entrées au scroll : `whileInView`, `once: true`, 16 px maximum, jamais de
  scale ni de rotation.
- `whileTap={{ scale: 0.97 }}` sur tous les boutons (`useTap()`).
- Easing de marque : `[0.16, 1, 0.3, 1]`.

## Analytics

Huit events, pas un de plus, tous typés dans `src/lib/analytics.ts`. Un event
mal nommé est un event qu'on ne retrouvera jamais dans le funnel — d'où
l'union TypeScript plutôt que des chaînes libres.

## Travailler sur le pipeline

`AI_PROVIDER=mock` permet de parcourir l'intégralité du produit sans un euro
d'API. Le mock respecte le contrat réel : il rend la main tout de suite et
rappelle le webhook 4 s plus tard, comme le ferait fal.ai. Développe et teste
toujours avec le mock avant de brancher un vrai fournisseur.

## Vérifier avant de pousser

```bash
npm run typecheck && npm run lint && npm run build
```

Le SQL se vérifie en le rejouant : les migrations sont idempotentes
(`if not exists`, `create or replace`, `on conflict do update`).
