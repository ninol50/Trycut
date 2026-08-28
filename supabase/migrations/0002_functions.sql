-- ---------------------------------------------------------------------------
-- 0002 — Fonctions métier (security definer)
--
-- Toute la logique de crédits vit ici. Aucun décompte côté client, aucun
-- décompte côté route serverless : une seule transaction Postgres.
-- ---------------------------------------------------------------------------

-- Création du profil à l'inscription ----------------------------------------

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

-- Crédit offert : après vérification de l'email, une seule fois -------------

create or replace function public.grant_signup_bonus(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_confirmed timestamptz;
  v_credits   integer;
begin
  select email_confirmed_at into v_confirmed from auth.users where id = p_user_id;
  if v_confirmed is null then
    select credits_remaining into v_credits from public.profiles where id = p_user_id;
    return coalesce(v_credits, 0);
  end if;

  update public.profiles
     set credits_remaining = credits_remaining + 1,
         signup_bonus_granted = true
   where id = p_user_id
     and signup_bonus_granted = false
  returning credits_remaining into v_credits;

  if found then
    insert into public.credit_ledger (user_id, delta, reason)
    values (p_user_id, 1, 'signup_bonus');
  else
    select credits_remaining into v_credits from public.profiles where id = p_user_id;
  end if;

  return coalesce(v_credits, 0);
end;
$$;

-- Ajout de crédits (achat de pack, renouvellement d'abonnement) -------------

create or replace function public.add_credits(
  p_user_id uuid,
  p_amount  integer,
  p_reason  credit_reason
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer;
begin
  if p_amount <= 0 then
    raise exception 'add_credits: montant invalide (%)', p_amount;
  end if;

  update public.profiles
     set credits_remaining = credits_remaining + p_amount
   where id = p_user_id
  returning credits_remaining into v_credits;

  if not found then
    raise exception 'add_credits: profil introuvable (%)', p_user_id;
  end if;

  insert into public.credit_ledger (user_id, delta, reason)
  values (p_user_id, p_amount, p_reason);

  return v_credits;
end;
$$;

-- ---------------------------------------------------------------------------
-- start_generation : le cœur du garde-fou.
--
-- Ordre des contrôles, volontaire :
--   1. article de catalogue valide et accessible au plan
--   2. rate limit utilisateur (5 / heure)
--   3. plafond global du jour — incrément atomique avec garde
--   4. débit du crédit — si échec, on rend le plafond consommé
--   5. insertion de la ligne `generations` + écriture au ledger
--
-- Rien n'est débité quand un contrôle échoue.
-- ---------------------------------------------------------------------------

create or replace function public.start_generation(
  p_user_id         uuid,
  p_catalog_item_id uuid,
  p_source_path     text,
  p_daily_cap       integer,
  p_cost_cents      integer,
  p_hourly_limit    integer
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item         public.catalog_items%rowtype;
  v_plan         plan_tier;
  v_credits      integer;
  v_recent       integer;
  v_daily_count  integer;
  v_generation   uuid;
  v_watermarked  boolean;
begin
  select plan, credits_remaining into v_plan, v_credits
    from public.profiles where id = p_user_id;

  if not found then
    return json_build_object('ok', false, 'reason', 'no_credits',
                             'generation_id', null, 'credits_remaining', 0);
  end if;

  -- 1. Article de catalogue -------------------------------------------------
  select * into v_item from public.catalog_items where id = p_catalog_item_id;
  if not found then
    return json_build_object('ok', false, 'reason', 'unknown_catalog_item',
                             'generation_id', null, 'credits_remaining', v_credits);
  end if;

  if v_item.is_premium and v_plan <> 'pass' then
    return json_build_object('ok', false, 'reason', 'premium_locked',
                             'generation_id', null, 'credits_remaining', v_credits);
  end if;

  -- 2. Rate limit utilisateur ----------------------------------------------
  select count(*) into v_recent
    from public.generations
   where user_id = p_user_id
     and created_at > now() - interval '1 hour';

  if v_recent >= p_hourly_limit then
    return json_build_object('ok', false, 'reason', 'rate_limited',
                             'generation_id', null, 'credits_remaining', v_credits);
  end if;

  -- 3. Plafond global du jour ----------------------------------------------
  if p_daily_cap <= 0 then
    return json_build_object('ok', false, 'reason', 'daily_cap_reached',
                             'generation_id', null, 'credits_remaining', v_credits);
  end if;

  insert into public.daily_spend as d (date, generation_count, estimated_cost_cents)
  values (current_date, 1, p_cost_cents)
  on conflict (date) do update
     set generation_count     = d.generation_count + 1,
         estimated_cost_cents = d.estimated_cost_cents + p_cost_cents
   where d.generation_count < p_daily_cap
  returning d.generation_count into v_daily_count;

  if v_daily_count is null then
    return json_build_object('ok', false, 'reason', 'daily_cap_reached',
                             'generation_id', null, 'credits_remaining', v_credits);
  end if;

  -- 4. Débit du crédit ------------------------------------------------------
  update public.profiles
     set credits_remaining = credits_remaining - 1
   where id = p_user_id
     and credits_remaining > 0
  returning credits_remaining into v_credits;

  if not found then
    -- Le plafond avait été incrémenté : on le rend, aucune génération ne partira.
    update public.daily_spend
       set generation_count     = greatest(generation_count - 1, 0),
           estimated_cost_cents = greatest(estimated_cost_cents - p_cost_cents, 0)
     where date = current_date;

    select credits_remaining into v_credits from public.profiles where id = p_user_id;
    return json_build_object('ok', false, 'reason', 'no_credits',
                             'generation_id', null, 'credits_remaining', coalesce(v_credits, 0));
  end if;

  -- 5. Ligne de génération + ledger ----------------------------------------
  v_watermarked := (v_plan = 'free');

  insert into public.generations
    (user_id, catalog_item_id, source_path, status, credits_cost, watermarked)
  values
    (p_user_id, v_item.id, p_source_path, 'queued', 1, v_watermarked)
  returning id into v_generation;

  insert into public.credit_ledger (user_id, delta, reason, generation_id)
  values (p_user_id, -1, 'generation', v_generation);

  return json_build_object('ok', true, 'reason', 'started',
                           'generation_id', v_generation, 'credits_remaining', v_credits);
end;
$$;

-- ---------------------------------------------------------------------------
-- start_guest_generation : l'essai offert de l'onboarding, sans compte.
--
-- Aucun crédit n'est débité — il n'y a pas encore de profil. Les garde-fous
-- sont le plafond global du jour et la limite par IP (3 / 24 h).
-- ---------------------------------------------------------------------------

create or replace function public.start_guest_generation(
  p_guest_id        uuid,
  p_catalog_item_id uuid,
  p_source_path     text,
  p_daily_cap       integer,
  p_cost_cents      integer,
  p_ip_hash         text,
  p_ip_limit        integer
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item        public.catalog_items%rowtype;
  v_ip_count    integer;
  v_guest_count integer;
  v_daily_count integer;
  v_generation  uuid;
begin
  select * into v_item from public.catalog_items where id = p_catalog_item_id;
  if not found then
    return json_build_object('ok', false, 'reason', 'unknown_catalog_item',
                             'generation_id', null, 'credits_remaining', 0);
  end if;

  -- Le catalogue premium est réservé aux comptes payants.
  if v_item.is_premium then
    return json_build_object('ok', false, 'reason', 'premium_locked',
                             'generation_id', null, 'credits_remaining', 0);
  end if;

  -- Un seul essai par visiteur.
  select count(*) into v_guest_count
    from public.generations
   where guest_id = p_guest_id
     and status <> 'failed';

  if v_guest_count >= 1 then
    return json_build_object('ok', false, 'reason', 'guest_trial_used',
                             'generation_id', null, 'credits_remaining', 0);
  end if;

  -- Limite par IP sur 24 h : bloque les comptes jetables en boucle.
  select count(*) into v_ip_count
    from public.ip_generation_log
   where ip_hash = p_ip_hash
     and created_at > now() - interval '24 hours';

  if v_ip_count >= p_ip_limit then
    return json_build_object('ok', false, 'reason', 'rate_limited',
                             'generation_id', null, 'credits_remaining', 0);
  end if;

  if p_daily_cap <= 0 then
    return json_build_object('ok', false, 'reason', 'daily_cap_reached',
                             'generation_id', null, 'credits_remaining', 0);
  end if;

  insert into public.daily_spend as d (date, generation_count, estimated_cost_cents)
  values (current_date, 1, p_cost_cents)
  on conflict (date) do update
     set generation_count     = d.generation_count + 1,
         estimated_cost_cents = d.estimated_cost_cents + p_cost_cents
   where d.generation_count < p_daily_cap
  returning d.generation_count into v_daily_count;

  if v_daily_count is null then
    return json_build_object('ok', false, 'reason', 'daily_cap_reached',
                             'generation_id', null, 'credits_remaining', 0);
  end if;

  insert into public.generations
    (guest_id, catalog_item_id, source_path, status, credits_cost, watermarked)
  values
    (p_guest_id, v_item.id, p_source_path, 'queued', 0, true)
  returning id into v_generation;

  insert into public.ip_generation_log (ip_hash) values (p_ip_hash);

  return json_build_object('ok', true, 'reason', 'started',
                           'generation_id', v_generation, 'credits_remaining', 0);
end;
$$;

-- Rattachement des essais invités au compte fraîchement créé ----------------

create or replace function public.claim_guest_generations(
  p_user_id  uuid,
  p_guest_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.generations
     set user_id  = p_user_id,
         guest_id = null
   where guest_id = p_guest_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Succès : on enregistre le résultat ----------------------------------------

create or replace function public.complete_generation(
  p_generation_id uuid,
  p_result_path   text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.generations
     set status       = 'succeeded',
         result_path  = p_result_path,
         completed_at = now(),
         error_code   = null,
         error_message = null
   where id = p_generation_id
     and status in ('queued', 'processing');

  return found;
end;
$$;

-- Échec : remboursement automatique dans la même transaction ----------------

create or replace function public.fail_generation(
  p_generation_id uuid,
  p_error_code    text,
  p_error_message text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_cost    integer;
  v_refund  uuid;
begin
  update public.generations
     set status        = 'failed',
         error_code    = p_error_code,
         error_message = p_error_message,
         completed_at  = now()
   where id = p_generation_id
     and status in ('queued', 'processing')
  returning user_id, credits_cost into v_user_id, v_cost;

  if not found then
    return false;
  end if;

  -- Essai invité : aucun crédit n'avait été débité, rien à rembourser.
  if v_user_id is null or v_cost <= 0 then
    return true;
  end if;

  -- L'index partiel garantit un unique remboursement par génération, même si
  -- le webhook du fournisseur arrive trois fois.
  insert into public.credit_ledger (user_id, delta, reason, generation_id)
  values (v_user_id, v_cost, 'refund', p_generation_id)
  on conflict (generation_id) where reason = 'refund' do nothing
  returning id into v_refund;

  if v_refund is not null then
    update public.profiles
       set credits_remaining = credits_remaining + v_cost
     where id = v_user_id;
  end if;

  return true;
end;
$$;

-- Suppression de compte : profil, générations, entrées de stockage ----------
-- Les fichiers Storage sont supprimés côté serveur avant l'appel ; cette
-- fonction renvoie les chemins concernés pour que l'appelant les nettoie.

create or replace function public.list_user_media(p_user_id uuid)
returns table (path text)
language sql
security definer
set search_path = public
as $$
  select source_path from public.generations where user_id = p_user_id
  union
  select result_path from public.generations
   where user_id = p_user_id and result_path is not null;
$$;

-- Purge J+30 : renvoie les chemins expirés puis efface les références -------

create or replace function public.expire_old_media(p_days integer default 30)
returns table (path text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with expired as (
    select id, source_path, result_path
      from public.generations
     where created_at < now() - make_interval(days => p_days)
       and (source_path is not null or result_path is not null)
  ),
  cleared as (
    update public.generations g
       set source_path = '',
           result_path = null
      from expired e
     where g.id = e.id
    returning e.source_path as s, e.result_path as r
  )
  select c.s from cleared c where c.s is not null and c.s <> ''
  union
  select c.r from cleared c where c.r is not null and c.r <> '';
end;
$$;

-- Droits d'exécution --------------------------------------------------------
-- start_generation, add_credits, complete_generation et fail_generation ne
-- sont appelées que par le service_role depuis les routes serveur.

revoke all on function public.start_generation(uuid, uuid, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.start_guest_generation(uuid, uuid, text, integer, integer, text, integer) from public, anon, authenticated;
revoke all on function public.claim_guest_generations(uuid, uuid) from public, anon, authenticated;
revoke all on function public.add_credits(uuid, integer, credit_reason) from public, anon, authenticated;
revoke all on function public.complete_generation(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_generation(uuid, text, text) from public, anon, authenticated;
revoke all on function public.expire_old_media(integer) from public, anon, authenticated;
revoke all on function public.list_user_media(uuid) from public, anon, authenticated;
revoke all on function public.grant_signup_bonus(uuid) from public, anon;
grant execute on function public.grant_signup_bonus(uuid) to authenticated;
