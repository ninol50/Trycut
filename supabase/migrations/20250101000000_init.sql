-- Trycut — schéma initial (section 8 du brief)
-- Rejouable : tout est en IF NOT EXISTS / CREATE OR REPLACE.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- types
do $$ begin
  create type subscription_status as enum ('none','active','past_due','canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_tier as enum ('free','pack','pass');
exception when duplicate_object then null; end $$;

do $$ begin
  create type generation_status as enum ('queued','processing','succeeded','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type catalog_category as enum ('cut','color','accessory');
exception when duplicate_object then null; end $$;

do $$ begin
  create type credit_reason as enum
    ('signup_bonus','generation','refund','pack_grant','subscription_grant');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  stripe_customer_id text unique,
  subscription_status subscription_status not null default 'none',
  plan plan_tier not null default 'free',
  current_period_end timestamptz,
  credits_remaining int not null default 0 check (credits_remaining >= 0),
  photo_retention_optin boolean not null default false,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------- onboarding_responses
create table if not exists public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz
);
create index if not exists onboarding_responses_user_idx
  on public.onboarding_responses(user_id);

-- -------------------------------------------------------- catalog_items
create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  category catalog_category not null,
  style_tags text[] not null default '{}',
  prompt_template text not null,
  preview_path text not null,
  is_premium boolean not null default false,
  sort_order int not null default 0
);
create index if not exists catalog_items_category_idx on public.catalog_items(category);
create index if not exists catalog_items_tags_idx on public.catalog_items using gin(style_tags);

-- ----------------------------------------------------------- generations
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anon_token text,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  source_path text not null,
  result_path text,
  status generation_status not null default 'queued',
  error_code text,
  error_message text,
  provider_job_id text,
  credits_cost int not null default 1,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint generations_owner_check
    check (user_id is not null or anon_token is not null)
);
create index if not exists generations_user_idx on public.generations(user_id, created_at desc);
create index if not exists generations_anon_idx on public.generations(anon_token);
create index if not exists generations_provider_job_idx on public.generations(provider_job_id);
create index if not exists generations_created_idx on public.generations(created_at);

-- --------------------------------------------------------- credit_ledger
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null,
  reason credit_reason not null,
  generation_id uuid references public.generations(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on public.credit_ledger(user_id, created_at desc);

-- Un seul bonus d'inscription par compte (section 7.4).
create unique index if not exists credit_ledger_signup_bonus_once
  on public.credit_ledger(user_id)
  where reason = 'signup_bonus';

-- Un seul débit par génération : garde-fou contre le double appel.
create unique index if not exists credit_ledger_generation_once
  on public.credit_ledger(generation_id)
  where reason = 'generation';

-- ------------------------------------------------------------ daily_spend
create table if not exists public.daily_spend (
  date date primary key,
  generation_count int not null default 0,
  estimated_cost_cents int not null default 0
);

-- --------------------------------------------------------- webhook_events
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  unique (provider, external_id)
);

-- ------------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.catalog_items enable row level security;
alter table public.generations enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.daily_spend enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists onboarding_select_own on public.onboarding_responses;
create policy onboarding_select_own on public.onboarding_responses
  for select using (user_id = (select auth.uid()));

drop policy if exists onboarding_insert_own on public.onboarding_responses;
create policy onboarding_insert_own on public.onboarding_responses
  for insert with check (user_id = (select auth.uid()));

drop policy if exists onboarding_update_own on public.onboarding_responses;
create policy onboarding_update_own on public.onboarding_responses
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Catalogue : lecture publique (anon inclus, l'essai gratuit en a besoin).
drop policy if exists catalog_read_all on public.catalog_items;
create policy catalog_read_all on public.catalog_items
  for select to anon, authenticated using (true);

-- Générations : jamais de ligne anonyme visible côté client.
drop policy if exists generations_select_own on public.generations;
create policy generations_select_own on public.generations
  for select using (user_id is not null and user_id = (select auth.uid()));

-- Ledger : lecture seule côté client. Aucune policy d'écriture :
-- seules les fonctions security definer écrivent.
drop policy if exists credit_ledger_select_own on public.credit_ledger;
create policy credit_ledger_select_own on public.credit_ledger
  for select using (user_id = (select auth.uid()));

-- daily_spend et webhook_events : aucune policy => service role uniquement.

-- ------------------------------------------------- création du profil
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'first_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------- crédits : débit atomique
-- Retourne le solde restant, ou -1 si le solde était insuffisant.
create or replace function public.consume_credit(
  p_user_id uuid,
  p_generation_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining int;
begin
  update public.profiles
     set credits_remaining = credits_remaining - 1
   where id = p_user_id
     and credits_remaining > 0
  returning credits_remaining into v_remaining;

  if v_remaining is null then
    return -1;
  end if;

  insert into public.credit_ledger (user_id, delta, reason, generation_id)
  values (p_user_id, -1, 'generation', p_generation_id);

  return v_remaining;
end;
$$;

-- Remboursement : idempotent, une seule ligne 'refund' par génération.
create or replace function public.refund_credit(
  p_user_id uuid,
  p_generation_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining int;
begin
  if exists (
    select 1 from public.credit_ledger
     where generation_id = p_generation_id and reason = 'refund'
  ) then
    select credits_remaining into v_remaining from public.profiles where id = p_user_id;
    return coalesce(v_remaining, 0);
  end if;

  update public.profiles
     set credits_remaining = credits_remaining + 1
   where id = p_user_id
  returning credits_remaining into v_remaining;

  if v_remaining is null then
    return 0;
  end if;

  insert into public.credit_ledger (user_id, delta, reason, generation_id)
  values (p_user_id, 1, 'refund', p_generation_id);

  return v_remaining;
end;
$$;

-- Octroi de crédits (bonus d'inscription, pack, abonnement).
create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount int,
  p_reason credit_reason
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining int;
begin
  begin
    insert into public.credit_ledger (user_id, delta, reason)
    values (p_user_id, p_amount, p_reason);
  exception when unique_violation then
    -- bonus d'inscription déjà accordé
    select credits_remaining into v_remaining from public.profiles where id = p_user_id;
    return coalesce(v_remaining, 0);
  end;

  update public.profiles
     set credits_remaining = credits_remaining + p_amount
   where id = p_user_id
  returning credits_remaining into v_remaining;

  return coalesce(v_remaining, 0);
end;
$$;

-- --------------------------------------------- plafonds de dépense (7.4)
-- Incrémente le compteur du jour et retourne l'état des plafonds.
-- Le plafond mensuel est vérifié AVANT le plafond journalier.
create or replace function public.check_and_reserve_spend(
  p_daily_cap int,
  p_monthly_cap_cents int,
  p_cost_cents int
)
returns table (allowed boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_cents int;
  v_day_count int;
begin
  -- Verrou de ligne sur le jour courant : sérialise les appels concurrents.
  insert into public.daily_spend (date, generation_count, estimated_cost_cents)
  values (current_date, 0, 0)
  on conflict (date) do nothing;

  perform 1 from public.daily_spend where date = current_date for update;

  select coalesce(sum(estimated_cost_cents), 0) into v_month_cents
    from public.daily_spend
   where date >= date_trunc('month', current_date)::date;

  if v_month_cents + p_cost_cents > p_monthly_cap_cents then
    return query select false, 'monthly_cap'::text;
    return;
  end if;

  select generation_count into v_day_count
    from public.daily_spend where date = current_date;

  if coalesce(v_day_count, 0) + 1 > p_daily_cap then
    return query select false, 'daily_cap'::text;
    return;
  end if;

  update public.daily_spend
     set generation_count = generation_count + 1,
         estimated_cost_cents = estimated_cost_cents + p_cost_cents
   where date = current_date;

  return query select true, 'ok'::text;
end;
$$;

-- Libère la réservation quand la génération n'a finalement pas eu lieu.
create or replace function public.release_spend(p_cost_cents int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.daily_spend
     set generation_count = greatest(generation_count - 1, 0),
         estimated_cost_cents = greatest(estimated_cost_cents - p_cost_cents, 0)
   where date = current_date;
end;
$$;

-- Postgres accorde EXECUTE à PUBLIC par défaut : révoquer sur anon/authenticated
-- ne suffit pas, il faut révoquer sur PUBLIC. Sans ça, la clé anon suffit à
-- appeler grant_credits et se créditer librement.
revoke all on function public.consume_credit(uuid, uuid) from public, anon, authenticated;
revoke all on function public.refund_credit(uuid, uuid) from public, anon, authenticated;
revoke all on function public.grant_credits(uuid, int, credit_reason) from public, anon, authenticated;
revoke all on function public.check_and_reserve_spend(int, int, int) from public, anon, authenticated;
revoke all on function public.release_spend(int) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.consume_credit(uuid, uuid) to service_role;
grant execute on function public.refund_credit(uuid, uuid) to service_role;
grant execute on function public.grant_credits(uuid, int, credit_reason) to service_role;
grant execute on function public.check_and_reserve_spend(int, int, int) to service_role;
grant execute on function public.release_spend(int) to service_role;
