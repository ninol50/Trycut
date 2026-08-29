-- L'accès n'est plus validé à la main.
--
-- Nouvelle règle : une inscription ouvre le site immédiatement. Générer une
-- coupe demande un abonnement — c'est le solde de coupes qui fait la barrière,
-- pas une approbation du propriétaire. 'rejected' subsiste, mais devient un
-- bannissement décidé après coup depuis /admin.
--
-- La vérification par email reste active côté Supabase : elle valide l'adresse,
-- elle n'accorde plus de privilège.

alter table public.profiles alter column access_status set default 'approved'::access_status;

update public.profiles set access_status = 'approved' where access_status = 'pending';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text := coalesce(new.email, '');
  v_admins text[];
  v_is_admin boolean;
begin
  select admin_emails into v_admins from public.app_config where id = 1;
  v_is_admin := v_email = any(coalesce(v_admins, '{}'));

  insert into public.profiles (id, email, first_name, age_confirmed, is_admin, access_status)
  values (
    new.id,
    v_email,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce((new.raw_user_meta_data ->> 'age_confirmed')::boolean, false),
    v_is_admin,
    'approved'::access_status
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

-- start_generation : le blocage « en attente » disparaît. Un compte banni est
-- refusé, un impayé est refusé, et sans coupe au compteur rien ne part.
create or replace function public.start_generation(p_catalog_item_id uuid, p_source_path text)
returns table(generation_id uuid, callback_secret text, credits_left integer, prompt_template text, error_code text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_cfg public.app_config%rowtype;
  v_template text; v_recent int; v_spend record;
  v_remaining int; v_id uuid; v_secret text;
begin
  if v_uid is null then
    return query select null::uuid, null::text, 0, null::text, 'auth'::text; return;
  end if;

  select * into v_profile from public.profiles where id = v_uid;

  if v_profile.access_status = 'rejected' then
    return query select null::uuid, null::text, 0, null::text, 'rejected'::text; return;
  end if;

  if v_profile.subscription_status = 'past_due' then
    return query select null::uuid, null::text, 0, null::text, 'payment'::text; return;
  end if;

  if p_source_path is null or p_source_path not like v_uid::text || '/%' then
    return query select null::uuid, null::text, 0, null::text, 'file'::text; return;
  end if;

  select ci.prompt_template into v_template
    from public.catalog_items ci where ci.id = p_catalog_item_id;
  if v_template is null then
    return query select null::uuid, null::text, 0, null::text, 'file'::text; return;
  end if;

  select * into v_cfg from public.app_config where id = 1;

  select count(*) into v_recent from public.generations g
   where g.user_id = v_uid and g.created_at > now() - interval '1 hour';
  if v_recent >= v_cfg.user_hourly_limit then
    return query select null::uuid, null::text, 0, null::text, 'capacity'::text; return;
  end if;

  select * into v_spend from public.check_and_reserve_spend(
    v_cfg.daily_generation_cap, v_cfg.monthly_spend_cap_cents, v_cfg.cost_per_generation_cents);
  if not v_spend.allowed then
    return query select null::uuid, null::text, 0, null::text, 'capacity'::text; return;
  end if;

  -- Sans coupe au compteur, rien ne part : c'est ici que le paiement fait loi.
  v_remaining := public.consume_credit(v_uid, null);
  if v_remaining < 0 then
    perform public.release_spend(v_cfg.cost_per_generation_cents);
    return query select null::uuid, null::text, 0, null::text, 'quota'::text; return;
  end if;

  insert into public.generations (user_id, catalog_item_id, source_path, status, credits_cost, watermarked)
  values (v_uid, p_catalog_item_id, p_source_path, 'queued', 1, false)
  returning id, generations.callback_secret into v_id, v_secret;

  update public.credit_ledger cl set generation_id = v_id
   where cl.id = (
     select cl2.id from public.credit_ledger cl2
      where cl2.user_id = v_uid
        and cl2.reason = 'generation'
        and cl2.generation_id is null
      order by cl2.created_at desc, cl2.id desc
      limit 1
   );

  return query select v_id, v_secret, v_remaining, v_template, null::text;
end;
$function$;

revoke all on function public.start_generation(uuid, text) from public, anon;
grant execute on function public.start_generation(uuid, text) to authenticated;
