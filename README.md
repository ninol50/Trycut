# Trycut

Teste ta prochaine coupe avant de t'asseoir dans le fauteuil.

Web app mobile-first : l'utilisateur importe un selfie, choisit une coupe, une
coloration ou un accessoire dans un catalogue filtré selon son profil, et l'IA
régénère la zone concernée en respectant l'angle du visage, la texture des
cheveux et l'éclairage. Résultat en comparateur avant/après, exportable en 9:16.

**Le parcours complet est jouable sans un euro d'API** grâce au `MockProvider`
(`AI_PROVIDER=mock`).

---

## Démarrage rapide

```bash
npm install
cp .env.example .env.local     # puis remplir la section Supabase
npm run dev                    # http://localhost:3000
```

Sans `.env.local`, l'app démarre quand même : le catalogue est vide et les
pages affichent un message explicite plutôt que de planter.

---

## Variables d'environnement

Toutes sont documentées dans `.env.example`. Les indispensables au parcours
complet en local :

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL publique. Sert à construire l'URL de webhook et les redirections Stripe. |
| `NEXT_PUBLIC_SUPABASE_URL` | Projet Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique, soumise au RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Serveur uniquement.** Contourne le RLS : ne jamais la préfixer `NEXT_PUBLIC_`. |
| `AI_PROVIDER` | `mock` (défaut) ou `fal`. |
| `AI_WEBHOOK_SECRET` | Authentifie les rappels du fournisseur IA. |
| `CRON_SECRET` | Authentifie le cron de purge, et sale le hachage des IP. |

Optionnelles : `FAL_KEY`, `FAL_MODEL`, `STRIPE_*`, `RESEND_API_KEY`,
`NEXT_PUBLIC_POSTHOG_KEY`.

Sans `RESEND_API_KEY`, `sendEmail()` log en console au lieu d'envoyer.
Sans clé PostHog, rien n'est initialisé. Dans les deux cas, l'app fonctionne.

---

## Mise en place de Supabase

### 1. Appliquer les migrations

Les fichiers de `supabase/migrations/` sont numérotés, versionnés et
**rejouables** : `if not exists`, `create or replace`, `on conflict do update`
partout. Les rejouer sur une base déjà à jour ne casse rien.

Avec la CLI Supabase :

```bash
supabase link --project-ref <ref>
supabase db push
```

Ou en collant les quatre fichiers dans l'ordre dans le SQL Editor du
dashboard :

| Fichier | Contenu |
|---|---|
| `0001_schema.sql` | Tables, types, index, contraintes |
| `0002_functions.sql` | Logique de crédits (`security definer`) |
| `0003_rls.sql` | RLS, buckets privés, privilèges de colonne |
| `0004_seed_catalog.sql` | 38 entrées de catalogue |

### 2. Vérifier

```sql
select category, count(*) from public.catalog_items group by category;
-- accessory 10 · color 8 · cut 20
```

### 3. Configurer l'authentification

Dans **Authentication → Providers → Email** : activer *Confirm email*. Le
crédit offert est accordé **à la vérification de l'adresse**, jamais avant.

Dans **Authentication → URL Configuration**, ajouter en *Redirect URL* :
`http://localhost:3000/auth/callback` (et l'équivalent en production).

### 4. Storage

Les buckets `selfies` et `generations` sont créés par `0003_rls.sql`. Ils sont
**privés** : aucun accès direct, uniquement des URL signées 60 s émises après
vérification serveur de la propriété de la ligne.

---

## Basculer du mock au fournisseur réel

Le fournisseur est abstrait derrière `src/lib/ai/provider.ts`, interface
unique `generate(input): Promise<{ jobId: string }>`.

```bash
# Développement : aucun coût, rappel du webhook après 4 s
AI_PROVIDER=mock

# Production
AI_PROVIDER=fal
FAL_KEY=...
FAL_MODEL=fal-ai/flux/dev/image-to-image
AI_WEBHOOK_SECRET=<chaîne longue et aléatoire>
```

Aucun autre changement de code. `FalProvider` passe par `queue.fal.run` avec
`fal_webhook` : la requête rend un `request_id` immédiatement et fal rappelle
`/api/webhooks/ai` quand l'image est prête.

Le webhook est authentifié dans les deux cas : signature HMAC pour le mock,
secret partagé transporté dans l'URL de rappel pour fal.

> Pour ajouter un troisième fournisseur : implémenter `AiProvider`, l'ajouter
> au `switch` de `provider.ts`. Rien d'autre à toucher.

---

## Régler le plafond de dépense

C'est le garde-fou le plus important du projet. Le budget d'inférence est
inférieur à 20 €/mois : sans plafond, une seule journée de trafic TikTok le
consomme entièrement.

| Variable | Défaut | Effet |
|---|---|---|
| `DAILY_GENERATION_CAP` | `40` | Générations maximum par jour, **tous utilisateurs confondus**. |
| `ESTIMATED_COST_CENTS_PER_GENERATION` | `4` | Coût estimé, suivi dans `daily_spend`. |
| `USER_HOURLY_GENERATION_LIMIT` | `5` | Générations par utilisateur et par heure. |
| `IP_FREE_GENERATION_LIMIT` | `3` | Essais gratuits par IP sur 24 h. |

Au-delà du plafond, `POST /api/generations` renvoie **503** avec un message
honnête et **aucun crédit n'est débité**.

Le plafond est appliqué **en base**, dans la même transaction que le débit
(`start_generation`), pas dans la route. Deux requêtes simultanées ne peuvent
pas le franchir ensemble.

Pour calibrer : `DAILY_GENERATION_CAP × ESTIMATED_COST_CENTS_PER_GENERATION ×
30 / 100` donne la dépense mensuelle plafond en euros. Avec les valeurs par
défaut : 40 × 4 × 30 / 100 = **48 €/mois** au pire. À ajuster selon le budget
réel et le coût constaté du modèle.

Suivi de la consommation :

```sql
select * from public.daily_spend order by date desc limit 14;
```

---

## Le pipeline de génération

```
POST /api/generations   { imagePath, catalogItemId }
   │  session vérifiée · propriété de la photo vérifiée
   │  start_generation() : plafond + rate limit + débit du crédit + ligne queued
   │                       le tout dans UNE transaction Postgres
   │  appel du fournisseur, sans jamais attendre le résultat
   └─▶ { generationId }

   client ──▶ Supabase Realtime sur la ligne (utilisateurs connectés)
          └─▶ repli : GET /api/generations/:id toutes les 2 s, timeout 120 s

POST /api/webhooks/ai
   │  signature vérifiée · idempotence par webhook_events.external_id
   │  téléchargement du résultat → bucket privé
   └─▶ complete_generation()  ou  fail_generation() → crédit remboursé
```

Le repli par polling tourne **dans tous les cas** : Realtime accélère, il
n'est jamais la seule voie. Un visiteur anonyme n'a d'ailleurs pas accès à
Realtime, le RLS ne lui exposant aucune ligne.

### L'essai offert, avant tout compte

Le parcours d'onboarding permet un essai **sans créer de compte** : c'est ce
qui convertit, l'utilisateur voit son propre visage transformé avant qu'on lui
demande quoi que ce soit. Ces générations portent un `guest_id` (cookie signé
HMAC, `httpOnly`), ne consomment aucun crédit, et sont plafonnées par IP.
À l'inscription, `claim_guest_generations()` les rattache au nouveau profil.

Le crédit offert, lui, reste accordé **après vérification de l'email** et une
seule fois par compte.

---

## Données personnelles

Le produit traite des photos de visage. Ce ne sont pas des données
biométriques au sens strict — aucune identification n'est effectuée — mais ce
sont des données personnelles.

- **Purge automatique à J+30** : cron Vercel quotidien (`vercel.json`) vers
  `/api/cron/cleanup`, authentifié par `CRON_SECRET`.
- **Suppression de compte réelle** sur `/compte` : profil, générations et
  fichiers Storage effacés.
- **Consentement explicite** avant le premier upload, case jamais pré-cochée.
- **Âge minimum 15 ans**, déclaré à l'inscription.
- Les adresses IP ne sont **jamais stockées en clair** : seul un HMAC salé
  sert à la limite anti-abus, et il est purgé au bout de 48 h.
- `/confidentialite` nomme le sous-traitant IA et la localisation du
  traitement, dérivés de `AI_PROVIDER` — la page ne peut pas se
  désynchroniser de ce que le service fait réellement.

Tester le cron en local :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/cleanup
```

---

## Stripe

Mode test. Créer deux prix dans le dashboard :

- **Pack** — 4,99 € paiement unique → `STRIPE_PRICE_PACK` (15 crédits)
- **Pass** — 9,99 €/mois abonnement → `STRIPE_PRICE_PASS` (60 crédits/mois)

Webhook vers `/api/webhooks/stripe`, événements : `checkout.session.completed`,
`invoice.paid`, `customer.subscription.created|updated|deleted`.

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Le webhook est **idempotent** : `webhook_events (provider, external_id)` est
unique et `event.id` sert de clé. Stripe rejoue ses événements — sans cette
barrière, un `checkout.session.completed` recréditerait un pack à chaque rejeu.

Les crédits du pass ne sont **pas reportables** : `invoice.paid` remet le
compteur à 60 au lieu d'additionner.

Le pack est l'offre mise en avant, volontairement. L'usage réel est épisodique
— on ne change pas de coupe toutes les semaines — et un abonnement mensuel sur
un usage ponctuel produit surtout du churn et des demandes de remboursement.

---

## Déploiement Vercel

1. Importer le dépôt.
2. Renseigner les variables d'environnement (voir plus haut).
3. Déployer. `vercel.json` déclare le cron de purge quotidien.
4. Mettre `NEXT_PUBLIC_SITE_URL` à l'URL de production, puis reporter cette
   URL dans les *Redirect URLs* Supabase et le webhook Stripe.

Rien d'autre à configurer.

---

## Scripts

```bash
npm run dev         # serveur de développement
npm run build       # build de production
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint, bloquant (--max-warnings=0)
```

---

## Ce qui reste à faire avant une vraie mise en service

Le chemin critique — onboarding → génération → inscription → paiement — est
complet et sans TODO. Les points suivants sont hors périmètre MVP mais
méritent d'être connus :

- **Filigrane et basse résolution appliqués à l'export côté client**
  (`src/lib/export.ts`). La décision vient du serveur
  (`generations.watermarked`, figée au moment de la génération d'après le
  plan), mais le rendu est fait dans le navigateur. Quelqu'un de motivé peut
  récupérer l'image non filigranée via le relais `/api/generations/:id/image`.
  Pour verrouiller, il faut compositer côté serveur — ce qui suppose une
  bibliothèque de traitement d'image (`sharp`) et un peu de temps de calcul
  par génération.
- **Validité de 6 mois des crédits du pack** : affichée sur `/tarifs`, mais
  aucune expiration n'est encore appliquée en base. Il faudrait dater chaque
  lot de crédits dans `credit_ledger` et les consommer par ancienneté.
- **Détection de visage** : le code d'erreur `no_face` existe et remonte
  jusqu'à l'UI, mais aucun fournisseur ne l'émet aujourd'hui. À brancher sur
  la détection du modèle réel.
- **Estimation automatique de la forme du visage** quand l'utilisateur répond
  « Je ne sais pas » à l'écran 5 : la réponse est enregistrée et n'exclut
  rien, mais l'estimation à l'upload n'est pas implémentée.
- **Liens d'affiliation** : s'ils sont ajoutés un jour, la mention « Lien
  partenaire » doit être visible à côté de chaque lien. C'est une obligation
  légale en France depuis la loi sur l'influence commerciale.
