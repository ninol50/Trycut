-- Choix multiple : une coupe ET une barbe, ou une couleur, dans le même rendu.
--
-- Les gabarits ne portent plus leur clause « garde le reste » : deux styles
-- combinés se contrediraient — « garde la barbe » avec « change la barbe ». Ce
-- qu'il faut préserver se déduit désormais des familles NON demandées, et se
-- construit côté serveur dans lib/ai/prompt.ts.
--
-- Un rendu combiné reste une seule coupe débitée.

alter table public.generations
  add column if not exists catalog_item_ids uuid[];

create or replace function public.start_generation(
  p_catalog_item_ids uuid[],
  p_source_path text
)
returns table(
  generation_id uuid,
  callback_secret text,
  credits_left integer,
  prompt_templates text[],
  categories text[],
  error_code text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_cfg public.app_config%rowtype;
  v_recent int; v_spend record;
  v_remaining int; v_id uuid; v_secret text;
  v_templates text[]; v_categories text[]; v_count int;
  v_primary uuid;
begin
  if v_uid is null then
    return query select null::uuid, null::text, 0, null::text[], null::text[], 'auth'::text; return;
  end if;

  select * into v_profile from public.profiles where id = v_uid;

  if v_profile.access_status = 'rejected' then
    return query select null::uuid, null::text, 0, null::text[], null::text[], 'rejected'::text; return;
  end if;

  if v_profile.subscription_status = 'past_due' then
    return query select null::uuid, null::text, 0, null::text[], null::text[], 'payment'::text; return;
  end if;

  if p_source_path is null or p_source_path not like v_uid::text || '/%' then
    return query select null::uuid, null::text, 0, null::text[], null::text[], 'file'::text; return;
  end if;

  -- Au plus un style par famille, et au plus quatre familles : sans cette
  -- limite, on empilerait dix consignes pour n'obtenir qu'une bouillie.
  select array_agg(ci.prompt_template order by ci.sort_order),
         array_agg(ci.category::text order by ci.sort_order),
         count(*),
         count(distinct ci.category)
    into v_templates, v_categories, v_count, v_recent
    from public.catalog_items ci
   where ci.id = any(p_catalog_item_ids)
     and ci.is_active;

  if v_templates is null
     or v_count <> coalesce(array_length(p_catalog_item_ids, 1), 0)
     or v_count > 4
     or v_recent <> v_count then
    return query select null::uuid, null::text, 0, null::text[], null::text[], 'file'::text; return;
  end if;

  select * into v_cfg from public.app_config where id = 1;

  select count(*) into v_recent from public.generations g
   where g.user_id = v_uid
     and g.created_at > now() - interval '1 hour'
     and not (g.status = 'failed' and g.error_code = 'provider');
  if v_recent >= v_cfg.user_hourly_limit then
    return query select null::uuid, null::text, 0, null::text[], null::text[], 'rate'::text; return;
  end if;

  select * into v_spend from public.check_and_reserve_spend(
    v_cfg.daily_generation_cap, v_cfg.monthly_spend_cap_cents, v_cfg.cost_per_generation_cents);
  if not v_spend.allowed then
    return query select null::uuid, null::text, 0, null::text[], null::text[], 'capacity'::text; return;
  end if;

  v_remaining := public.consume_credit(v_uid, null);
  if v_remaining < 0 then
    perform public.release_spend(v_cfg.cost_per_generation_cents);
    return query select null::uuid, null::text, 0, null::text[], null::text[], 'quota'::text; return;
  end if;

  select ci.id into v_primary from public.catalog_items ci
   where ci.id = any(p_catalog_item_ids) order by ci.sort_order limit 1;

  insert into public.generations
    (user_id, catalog_item_id, catalog_item_ids, source_path, status, credits_cost, watermarked)
  values (v_uid, v_primary, p_catalog_item_ids, p_source_path, 'queued', 1, false)
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

  return query select v_id, v_secret, v_remaining, v_templates, v_categories, null::text;
end;
$function$;

revoke all on function public.start_generation(uuid[], text) from public, anon;
grant execute on function public.start_generation(uuid[], text) to authenticated;
