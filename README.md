# Trycut

Teste ta prochaine coupe avant de t'asseoir dans le fauteuil.

Web app mobile-first d'essai virtuel de coupes, colorations et accessoires. L'utilisateur
importe un selfie, choisit un style dans un catalogue filtré par son profil, et l'IA
régénère la zone concernée en respectant l'angle du visage, la texture des cheveux et
l'éclairage. Résultat en comparateur avant/après, exportable en 9:16.

**Next.js 15 · TypeScript strict · Tailwind · Framer Motion · Supabase · Stripe · PostHog**

---

## Démarrage rapide

```bash
npm install
cp .env.example .env.local     # renseigner Supabase (voir plus bas)
npm run dev                    # http://localhost:3000
```

Avec `AI_PROVIDER=mock` (défaut), **l'intégralité du parcours est jouable sans un euro
d'API** : onboarding → upload → génération → résultat → export → inscription → paiement.

Sans Supabase configuré, la landing et l'onboarding restent parcourables (le catalogue
tombe sur les données statiques de `lib/catalog-data.ts`) ; l'upload et la génération
répondent 503 avec un message explicite.

---

## Variables d'environnement

Toutes sont documentées dans `.env.example`. Les indispensables :

**Aucune variable n'est nécessaire pour faire tourner le parcours.** L'URL et la clé
`anon` Supabase ont des valeurs par défaut dans `lib/public-env.ts` : elles sont publiques
par conception, et tout ce qu'elles autorisent est décidé par la RLS.

| Variable | Nécessaire pour |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Rien sur Vercel (`VERCEL_URL` sert de repli). À renseigner avec un domaine. |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Pointer vers un autre projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **Uniquement** le cron de purge et `AI_PROVIDER=fal` |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | **Créditer un compte après paiement** |
| `RESEND_API_KEY` + `EMAIL_FROM` | Envoyer réellement les emails (sinon log console) |
| `AI_PROVIDER` | `mock` (défaut) ou `fal` |

> `SUPABASE_SERVICE_ROLE_KEY` contourne la RLS. Jamais préfixée `NEXT_PUBLIC_`, jamais
> dans un bundle client.

Vérifier l'état des intégrations sur un déploiement : **`GET /api/health`**.

---

## Sécurité : pourquoi l'app tourne sur la clé publique

Le parcours n'utilise pas de clé toute-puissante. Chaque requête part avec la session de
l'utilisateur, et la RLS décide. Ce qui demande des privilèges passe par des fonctions
`security definer` dont les garde-fous sont dans la base :

- `start_generation()` — propriété du fichier, rate limit horaire, plafond mensuel puis
  journalier, débit du crédit et insertion, dans **une seule transaction**. Les plafonds
  sont lus dans `app_config`, pas reçus en paramètre : sinon un client authentifié
  fixerait les siens.
- `complete_generation()` / `fail_generation()` — le provider n'a pas de session, il prouve
  son droit par un secret propre à la ligne. Ce secret est **révoqué en lecture au niveau
  colonne** : même le propriétaire de la ligne ne peut pas le lire, donc personne ne peut
  déclarer sa propre coupe réussie. Un échec rembourse la coupe, une seule fois.
- `delete_own_account()` — ne peut effacer que `auth.uid()`.
- `grant_credits()` reste inaccessible aux utilisateurs : seul le webhook Stripe l'appelle,
  avec la clé service_role.

Régler les plafonds se fait donc en base, pas par variable d'environnement :

```sql
update app_config set daily_generation_cap = 40, monthly_spend_cap_cents = 5000;
```

## Setup Supabase

1. Créer un projet (région européenne de préférence).
2. Appliquer les migrations de `supabase/migrations/`, dans l'ordre des noms de fichiers :

   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```

   Ou, sans CLI : coller chaque fichier dans le SQL Editor du dashboard, dans l'ordre.
   Les migrations sont **rejouables** : les relancer ne casse rien.

3. Vérifier que les buckets `selfies` et `generations` sont créés et **privés**
   (`20250101000100_storage.sql` s'en charge).
4. Dans **Authentication → URL Configuration** : mettre *Site URL* sur l'URL du
   déploiement, et ajouter `<URL>/api/auth/callback` aux *Redirect URLs*. Sans ça, le lien
   de confirmation d'email renvoie sur `localhost` et l'inscription ne peut pas aboutir.
5. Optionnel : activer **Realtime** sur la table `generations` pour que le résultat
   s'affiche sans attendre le prochain sondage. Le polling (2 s, timeout 120 s) fonctionne
   sans.

Le seed du catalogue (`20250101000200_seed_catalog.sql`) est **généré** depuis
`lib/catalog.json`. Pour modifier le catalogue, éditer ce fichier puis :

```bash
node scripts/generate-seed.mjs
```

---

## Basculer du mock vers un vrai fournisseur IA

Le fournisseur est abstrait derrière `lib/ai/provider.ts`, une seule méthode :
`generate(input) => { jobId }`.

```bash
AI_PROVIDER=fal
FAL_KEY=...
```

Le `FalProvider` poste sur la file de fal.ai avec un `fal_webhook` pointant vers
`/api/webhooks/ai`. Le webhook télécharge l'image produite, la range dans le bucket privé
`generations/{user_id}/{generation_id}.jpg` et passe la ligne à `succeeded`.

En mode `mock`, le provider rappelle ce même webhook après 4 secondes ; faute d'image
générée, le webhook **réutilise la photo source** comme résultat. Tout le pipeline réel
(stockage, URL signée, export, filigrane) est donc exercé — seule l'image de sortie est
identique à l'entrée.

Penser à mettre à jour le nom du sous-traitant sur `/confidentialite` : il est déjà
piloté par `AI_PROVIDER` dans `app/confidentialite/page.tsx`.

---

## Réglage des plafonds de dépense

Sans garde-fou, une journée de trafic TikTok consomme le budget d'inférence du mois.
Trois variables, vérifiées **avant tout débit de crédit** :

| Variable | Défaut | Effet |
|---|---|---|
| `MONTHLY_SPEND_CAP_CENTS` | `1800` (18 €) | Vérifié **en premier** |
| `DAILY_GENERATION_CAP` | `15` | Générations par jour, toutes personnes confondues |
| `COST_PER_GENERATION_CENTS` | `4` | Coût estimé, sert au calcul mensuel |

Au-delà d'un plafond, `POST /api/generations` répond **503** avec « Beaucoup de monde en
ce moment… » et **aucun crédit n'est débité**. La réservation est atomique
(`check_and_reserve_spend`, verrou de ligne sur le jour courant) et libérée
(`release_spend`) si la génération échoue ensuite.

S'y ajoutent des limites par personne, non configurables : **5 générations / heure** par
compte, **3 essais gratuits / 24 h** par IP, **1 essai anonyme** par jeton.

---

## Offres et paiement

| Offre | Prix | Coupes / mois |
|---|---|---|
| Découverte | 0 € | 0 |
| Essentiel | 7,99 €/mois | 15 |
| **Complet** | **9,99 €/mois** | 25 |

Deux offres mensuelles, et la seconde est la meilleure affaire : deux euros de plus
donnent dix coupes de plus, donc elle revient moins cher à la coupe. Un test refuse
l'inverse.

Les boutons pointent sur des **liens de paiement Stripe**, posés par
`NEXT_PUBLIC_STRIPE_LINK_ESSENTIEL` / `NEXT_PUBLIC_STRIPE_LINK_COMPLET`. Aucune clé
serveur n'est nécessaire pour encaisser — elle ne sert qu'à créditer ensuite.

Les identifiants internes restent `pack` et `pass` : ce sont les valeurs de
l'énumération `plan_tier` en base, et tout le contrôle d'accès s'appuie dessus.

Pour que le paiement **crédite réellement le compte**, il reste à brancher le webhook :

1. Dans Stripe, webhook vers `<SITE_URL>/api/webhooks/stripe`, événements
   `checkout.session.completed`, `customer.subscription.*`, `invoice.paid` et
   `invoice.payment_failed` — c'est ce dernier qui coupe l'accès quand un paiement
   est refusé.
2. Copier le secret dans `STRIPE_WEBHOOK_SECRET`, et la clé secrète dans
   `STRIPE_SECRET_KEY`.
3. En local : `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

Les liens de paiement ne transmettent pas d'identifiant de prix connu à l'avance : l'offre
est retrouvée par le **montant facturé** (999 → Pack, 1790 → Pass), avec les
`STRIPE_PRICE_*` en priorité s'ils sont renseignés.

Le webhook est **idempotent** (contrainte unique sur `webhook_events.external_id`) : les
webhooks arrivent en double, systématiquement.

---

## Données personnelles

- Purge automatique : **J+30** pour les comptes, **J+1** pour les essais anonymes, via le
  cron Vercel quotidien déclaré dans `vercel.json` (`/api/cron/cleanup`, 03:00 UTC).
  Protéger la route avec `CRON_SECRET`.
- Suppression de compte réelle sur `/compte` : profil, générations et fichiers Storage.
- Écran de consentement avant le premier upload, case **jamais pré-cochée**.
- Déclaration d'âge (15 ans minimum) à l'inscription, stockée sur le profil.
- `/confidentialite` nomme le sous-traitant IA et la localisation du traitement.

---

## Déploiement Vercel

1. Importer le dépôt, framework détecté automatiquement.
2. Reporter toutes les variables de `.env.example` dans **Settings → Environment
   Variables**, en mettant `NEXT_PUBLIC_SITE_URL` à l'URL de production.
3. Déployer. Le cron de `vercel.json` est enregistré automatiquement.
4. Ajouter l'URL de production dans les *Redirect URLs* Supabase et dans le webhook Stripe.

---

## Scripts

```bash
npm run dev         # serveur de développement
npm run build       # build de production
npm run lint        # ESLint (bloquant)
npm run typecheck   # tsc --noEmit
node scripts/generate-seed.mjs   # régénère le seed SQL du catalogue
```

---

## Analytics

Les 9 events de `lib/analytics.ts` portent tous `variant` (= `ONBOARDING_LENGTH`), pour
comparer le parcours long et le parcours court :

`landing_cta_clicked` · `demo_video_viewed` · `onboarding_step_completed` ·
`onboarding_finished` · `photo_uploaded` · `first_generation_succeeded` ·
`signup_completed` · `share_clicked` · `checkout_completed`

Sans `NEXT_PUBLIC_POSTHOG_KEY`, les events sont écrits en `console.debug` — le
développement local n'a pas besoin de PostHog.

## Parcours

Par défaut, **aucune question** : le CTA mène directement à l'import de la photo, où l'on
choisit une coupe et où le comparateur avant/après reste disponible.

`NEXT_PUBLIC_ONBOARDING_LENGTH=none|short|full` — `none` par défaut. `short` sert 4 écrans
de profil, `full` les 13 du brief initial. Le code du questionnaire reste en place : le flag
permet de le rouvrir sans redéploiement de code.

`ENABLE_FREE_TRIAL=false` par défaut, puisque l'offre gratuite donne 0 coupe. Le passer à
`true` rouvre une génération offerte sans compte.

## Visuels

Aucune image n'est générée par le code. Voir **`public/demo/README.md`** pour la liste des
fichiers attendus et leurs specs. Tant qu'ils sont absents, l'app affiche des placeholders
violets aux dimensions explicites — pas de layout shift, pas de `<video>` cassé.

## Vérifications

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint, bloquant
npm test             # logique pure : catalogue, prompts, MIME, jeton anonyme
npm run audit:mobile # viewport 390px, cibles 48px, scroll horizontal
```

`audit:mobile` a besoin d'un serveur lancé (`npm run build && npm start -- -p 3100`)
et de Playwright, volontairement **hors dépendances** : son postinstall télécharge des
navigateurs, inutile sur un build de déploiement. À installer à la demande :

```bash
npm i -D --no-save playwright
```

## Emails

Deux canaux, indépendants :

1. **Vérification d'inscription** — envoyée par Supabase Auth, sans configuration.
   Il faut seulement que *Site URL* et *Redirect URLs* pointent sur le domaine de
   production (Authentication → URL Configuration), sinon le lien renvoie ailleurs.
2. **Emails transactionnels** (bienvenue, coupe prête, abonnement actif) — envoyés par
   Resend depuis `lib/email.ts`. Sans `RESEND_API_KEY`, ils sont écrits en console et
   rien n'échoue.

Pour les activer réellement, le domaine d'envoi doit être vérifié chez Resend (DKIM +
SPF), puis `EMAIL_FROM` doit utiliser ce domaine.
