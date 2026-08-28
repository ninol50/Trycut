-- ---------------------------------------------------------------------------
-- 0003 — RLS sur toutes les tables utilisateur et sur les buckets.
--
-- Principe : le client n'écrit jamais rien qui touche à l'argent. Crédits,
-- statuts de génération et dépense quotidienne passent exclusivement par les
-- fonctions `security definer` de 0002, appelées avec la clé service_role.
-- ---------------------------------------------------------------------------

alter table public.profiles             enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.generations          enable row level security;
alter table public.catalog_items        enable row level security;
alter table public.credit_ledger        enable row level security;
alter table public.daily_spend          enable row level security;
alter table public.ip_generation_log    enable row level security;
alter table public.webhook_events       enable row level security;

-- profiles ------------------------------------------------------------------
-- Lecture et mise à jour de son propre profil, mais jamais des colonnes
-- sensibles : le trigger ci-dessous les remet à leur valeur d'origine.

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- SECURITY INVOKER, volontairement : en SECURITY DEFINER, `current_user` vaut
-- toujours le propriétaire de la fonction. Le déclencheur ne verrait alors
-- jamais le vrai appelant — il laisserait passer les clients et annulerait au
-- passage les écritures légitimes des fonctions de crédits de 0002.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Seuls les rôles clients sont bridés. `postgres` (les fonctions security
  -- definer de 0002) et `service_role` (les routes serveur) ont le champ
  -- libre : ce sont eux qui portent la logique de crédits. Un client
  -- authentifié ne peut modifier que son prénom et ses préférences.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  new.credits_remaining    := old.credits_remaining;
  new.plan                 := old.plan;
  new.subscription_status  := old.subscription_status;
  new.current_period_end   := old.current_period_end;
  new.stripe_customer_id   := old.stripe_customer_id;
  new.signup_bonus_granted := old.signup_bonus_granted;
  new.email                := old.email;
  new.created_at           := old.created_at;
  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- onboarding_responses ------------------------------------------------------

drop policy if exists "onboarding_select_own" on public.onboarding_responses;
create policy "onboarding_select_own" on public.onboarding_responses
  for select using (auth.uid() = user_id);

drop policy if exists "onboarding_insert_own" on public.onboarding_responses;
create policy "onboarding_insert_own" on public.onboarding_responses
  for insert with check (auth.uid() = user_id);

drop policy if exists "onboarding_update_own" on public.onboarding_responses;
create policy "onboarding_update_own" on public.onboarding_responses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- generations ---------------------------------------------------------------
-- Lecture seule côté client (nécessaire à l'abonnement Realtime).
-- L'insertion et les transitions de statut passent par les fonctions serveur.

drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own" on public.generations
  for select using (auth.uid() = user_id);

-- catalog_items -------------------------------------------------------------
-- Lecture publique, mais `prompt_template` n'est jamais sélectionné par le
-- client : les requêtes applicatives listent les colonnes explicitement.

drop policy if exists "catalog_public_read" on public.catalog_items;
create policy "catalog_public_read" on public.catalog_items
  for select using (true);

-- credit_ledger -------------------------------------------------------------
-- Lecture seule. Aucune policy d'écriture : seules les fonctions
-- `security definer` peuvent insérer.

drop policy if exists "ledger_select_own" on public.credit_ledger;
create policy "ledger_select_own" on public.credit_ledger
  for select using (auth.uid() = user_id);

-- daily_spend, ip_generation_log, webhook_events ---------------------------
-- Aucune policy : tables purement serveur, inaccessibles avec la clé anon.

-- ---------------------------------------------------------------------------
-- Storage — aucun bucket public. Accès uniquement par URL signée 60 s.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('selfies', 'selfies', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('generations', 'generations', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Un utilisateur authentifié ne touche qu'au dossier qui porte son uuid.
-- Les uploads invités (`guest/<uuid>/…`) passent exclusivement par la route
-- serveur, avec la clé service_role : aucune policy ne les autorise ici.

drop policy if exists "selfies_rw_own_folder" on storage.objects;
create policy "selfies_rw_own_folder" on storage.objects
  for all
  to authenticated
  using (bucket_id = 'selfies' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'selfies' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "generations_read_own_folder" on storage.objects;
create policy "generations_read_own_folder" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'generations' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime : le client s'abonne à ses propres lignes de `generations`.
do $$ begin
  alter publication supabase_realtime add table public.generations;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Privilèges de colonne sur le catalogue.
--
-- La policy `catalog_public_read` porte sur les lignes, pas sur les colonnes :
-- sans la restriction ci-dessous, un client pourrait lire `prompt_template`
-- avec la clé anon. Le prompt ne doit jamais quitter le serveur.
-- ---------------------------------------------------------------------------

revoke select on public.catalog_items from anon, authenticated;
grant select (id, slug, label, category, style_tags, preview_path, is_premium, sort_order, created_at)
  on public.catalog_items to anon, authenticated;
