-- Deux défauts dans start_generation, tous deux fatals au produit.
--
-- 1. `generation_id` est à la fois une colonne de credit_ledger et une colonne
--    de sortie de la fonction. Postgres refusait de trancher :
--    « column reference generation_id is ambiguous ». Toute coupe lancée par un
--    compte en règle échouait, crédit débité puis rendu par l'annulation de la
--    transaction. Aucune génération n'était possible en production.
--
-- 2. Le rattachement du débit visait « toutes les lignes non rattachées » du
--    compte. À partir de deux, elles recevaient le même identifiant et
--    violaient credit_ledger_generation_once. On ne rattache plus que la
--    dernière ligne écrite.
--
-- Vérifié après correctif : deux coupes consécutives passent, le solde descend
-- de 15 à 13, et chaque débit est rattaché à sa coupe.
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

  -- Accès accordé à la main par le propriétaire du site.
  if v_profile.access_status = 'pending' then
    return query select null::uuid, null::text, 0, null::text, 'pending'::text; return;
  end if;
  if v_profile.access_status = 'rejected' then
    return query select null::uuid, null::text, 0, null::text, 'rejected'::text; return;
  end if;

  -- Paiement refusé : plus d'accès tant que la facture n'est pas réglée.
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

-- Vestige de l'itération précédente : les plafonds et l'identifiant du compte
-- y étaient des paramètres, donc fixables par l'appelant. Il n'était appelé par
-- rien et exécutable par personne — on l'enlève avant que des droits lui
-- soient rendus par inadvertance.
drop function if exists public.start_generation(uuid, uuid, text, integer, integer, integer);
