-- ---------------------------------------------------------------------------
-- 0001 — Schéma de base (section 8 du brief)
-- Rejouable : tout est en IF NOT EXISTS / CREATE OR REPLACE.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- Types énumérés ------------------------------------------------------------

do $$ begin
  create type subscription_status as enum ('none', 'active', 'past_due', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_tier as enum ('free', 'pass');
exception when duplicate_object then null; end $$;

do $$ begin
  create type generation_status as enum ('queued', 'processing', 'succeeded', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type catalog_category as enum ('cut', 'color', 'accessory');
exception when duplicate_object then null; end $$;

do $$ begin
  create type credit_reason as enum (
    'signup_bonus', 'generation', 'refund', 'pack_purchase', 'subscription_grant'
  );
exception when duplicate_object then null; end $$;

-- profiles ------------------------------------------------------------------

create table if not exists public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  email                 text not null,
  first_name            text,
  stripe_customer_id    text unique,
  subscription_status   subscription_status not null default 'none',
  plan                  plan_tier           not null default 'free',
  current_period_end    timestamptz,
  credits_remaining     integer             not null default 0 check (credits_remaining >= 0),
  photo_retention_optin boolean             not null default false,
  -- Un seul crédit gratuit par compte, accordé après vérification de l'email.
  signup_bonus_granted  boolean             not null default false,
  -- Déclaration d'âge minimum (15 ans, consentement numérique en France).
  age_confirmed         boolean             not null default false,
  created_at            timestamptz         not null default now()
);

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id);

-- onboarding_responses ------------------------------------------------------

create table if not exists public.onboarding_responses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  answers      jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

create unique index if not exists onboarding_responses_user_idx
  on public.onboarding_responses (user_id);

-- catalog_items -------------------------------------------------------------

create table if not exists public.catalog_items (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  label           text not null,
  category        catalog_category not null,
  style_tags      text[] not null default '{}',
  -- Template serveur. Jamais exposé au client, jamais rempli par lui.
  prompt_template text not null,
  preview_path    text not null,
  is_premium      boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists catalog_items_category_idx on public.catalog_items (category, sort_order);
create index if not exists catalog_items_tags_idx on public.catalog_items using gin (style_tags);

-- generations ---------------------------------------------------------------

-- `user_id` est nullable : l'essai offert de l'onboarding a lieu AVANT toute
-- création de compte (section 4 du brief). Ces lignes portent un `guest_id`
-- issu d'un cookie signé, et sont rattachées au profil à l'inscription.
-- L'essai invité ne consomme aucun crédit : il est plafonné par IP (3 / 24 h)
-- et par le plafond global du jour. Le crédit offert, lui, reste accordé après
-- vérification de l'email et jamais avant (section 7.4).
create table if not exists public.generations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles (id) on delete cascade,
  guest_id        uuid,
  catalog_item_id uuid not null references public.catalog_items (id) on delete restrict,
  source_path     text not null,
  result_path     text,
  status          generation_status not null default 'queued',
  error_code      text,
  error_message   text,
  provider_job_id text,
  credits_cost    integer not null default 1,
  -- Le filigrane dépend du plan au moment de la génération, pas de l'affichage.
  watermarked     boolean not null default true,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,
  constraint generations_owner_check
    check (num_nonnulls(user_id, guest_id) = 1)
);

create index if not exists generations_user_created_idx
  on public.generations (user_id, created_at desc);
create index if not exists generations_guest_idx
  on public.generations (guest_id, created_at desc);
create index if not exists generations_provider_job_idx
  on public.generations (provider_job_id);
create index if not exists generations_status_idx on public.generations (status);

-- credit_ledger -------------------------------------------------------------

create table if not exists public.credit_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  delta         integer not null,
  reason        credit_reason not null,
  generation_id uuid references public.generations (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);
-- Un seul remboursement possible par génération : l'idempotence du webhook IA.
create unique index if not exists credit_ledger_refund_once_idx
  on public.credit_ledger (generation_id) where reason = 'refund';

-- daily_spend ---------------------------------------------------------------

create table if not exists public.daily_spend (
  date                 date primary key,
  generation_count     integer not null default 0,
  estimated_cost_cents integer not null default 0
);

-- ip_generation_log ---------------------------------------------------------
-- Limite les générations gratuites par IP (3 / 24 h) pour bloquer la création
-- de comptes jetables en boucle.

create table if not exists public.ip_generation_log (
  id         uuid primary key default gen_random_uuid(),
  ip_hash    text not null,
  created_at timestamptz not null default now()
);

create index if not exists ip_generation_log_hash_idx
  on public.ip_generation_log (ip_hash, created_at desc);

-- webhook_events ------------------------------------------------------------
-- external_id unique = idempotence Stripe et IA. Les webhooks arrivent en
-- double, systématiquement.

create table if not exists public.webhook_events (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null,
  external_id  text not null,
  payload      jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  unique (provider, external_id)
);
