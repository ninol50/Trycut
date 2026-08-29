-- Deux défauts révélés par les essais réels.
--
-- 1. La limite de 5 coupes par heure comptait toutes les lignes, échecs
--    compris. Une personne dont les rendus échouent à cause du fournisseur se
--    retrouvait bloquée une heure entière, en plus de n'avoir rien obtenu :
--    elle n'a rien reçu, et on lui ferme la porte. Vérifié en production —
--    cinq échecs consécutifs, tous imputables au fournisseur, avaient épuisé
--    le quota horaire d'un compte à qui rien n'avait été livré.
--
-- 2. Ce blocage renvoyait 'capacity', dont le message annonce de l'affluence
--    sur le site. C'était faux et incompréhensible : personne d'autre ne
--    l'utilisait. Un code 'rate' distinct dit ce qui se passe vraiment.
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

  -- Un rendu raté par le fournisseur n'a rien coûté et n'a rien produit : il
  -- ne doit pas manger le quota horaire de la personne.
  select count(*) into v_recent from public.generations g
   where g.user_id = v_uid
     and g.created_at > now() - interval '1 hour'
     and not (g.status = 'failed' and g.error_code = 'provider');
  if v_recent >= v_cfg.user_hourly_limit then
    return query select null::uuid, null::text, 0, null::text, 'rate'::text; return;
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
