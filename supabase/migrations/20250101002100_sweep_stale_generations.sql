-- Une coupe restée « en cours » n'était rendue à personne si l'onglet était fermé.
--
-- expire_stale_generation ne s'exécute que depuis l'écran de suivi, sur la ligne
-- de l'appelant. Vu en production : une ligne en 'queued' depuis deux heures,
-- crédit débité, jamais remboursé — la personne avait simplement fermé l'onglet.
-- Plus rien n'y touchait.
--
-- Un balayage tourne donc côté serveur, sans dépendre de la présence de qui que
-- ce soit. Trente minutes de marge : un rendu en prend une trentaine de
-- secondes, rien de légitime ne dure aussi longtemps.
--
-- Au passage, deux remboursements accordaient un crédit qui n'avait jamais été
-- débité. Depuis l'accès offert, une génération peut coûter 0 : un accès offert
-- ou un administrateur ne consomme pas de solde. Rembourser sans regarder
-- credits_cost créditait ces comptes à chaque rendu raté — un robinet à crédits
-- ouvert par une simple attente de trois minutes. Les deux fonctions vérifient
-- désormais le coût réel de la ligne, comme le faisait déjà fail_generation à
-- trois arguments.

-- --------------------------------------------------------------- unitaire
create or replace function public.expire_stale_generation(p_generation_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row public.generations%rowtype;
  v_cost int;
begin
  select * into v_row from public.generations where id = p_generation_id;

  if v_row.id is null or v_row.user_id is distinct from auth.uid() then
    return false;
  end if;
  if v_row.status not in ('queued', 'processing') then
    return false;
  end if;
  -- Trois minutes : un rendu en prend une trentaine de secondes.
  if v_row.created_at > now() - interval '3 minutes' then
    return false;
  end if;

  update public.generations
     set status = 'failed',
         error_code = 'provider',
         error_message = 'Le service de rendu n’a pas répondu. Ta coupe t’a été rendue.',
         completed_at = now()
   where id = p_generation_id;

  select cost_per_generation_cents into v_cost from public.app_config where id = 1;
  -- release_spend ne touche que la ligne du jour : ne rien libérer pour une
  -- réservation d'hier, sinon on décrémente le compteur d'aujourd'hui à tort.
  if v_row.created_at >= current_date then
    perform public.release_spend(v_cost);
  end if;

  -- Un accès offert n'a rien payé : lui « rendre » une coupe la lui donnerait.
  if v_row.credits_cost > 0 then
    perform public.refund_credit(v_row.user_id, p_generation_id);
  end if;

  return true;
end;
$function$;

revoke all on function public.expire_stale_generation(uuid) from public, anon;
grant execute on function public.expire_stale_generation(uuid) to authenticated;

-- ------------------------------------------------------ échec fournisseur
create or replace function public.fail_generation(
  p_generation_id uuid,
  p_secret text,
  p_error_code text,
  p_error_message text
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row public.generations%rowtype;
  v_cost int;
begin
  select * into v_row from public.generations where id = p_generation_id;
  if v_row.id is null or v_row.callback_secret is distinct from p_secret then
    return false;
  end if;
  if v_row.status in ('succeeded', 'failed') then
    return true;
  end if;

  update public.generations
     set status = 'failed',
         error_code = p_error_code,
         error_message = p_error_message,
         completed_at = now()
   where id = p_generation_id;

  select cost_per_generation_cents into v_cost from public.app_config where id = 1;
  if v_row.created_at >= current_date then
    perform public.release_spend(v_cost);
  end if;

  if v_row.user_id is not null and v_row.credits_cost > 0 then
    perform public.refund_credit(v_row.user_id, p_generation_id);
  end if;
  return true;
end;
$function$;

-- ----------------------------------------------------------- balayage cron
-- Réservée au service_role : elle traverse tous les comptes, donc elle ne peut
-- pas passer par la RLS ni être appelée depuis le navigateur.
create or replace function public.sweep_stale_generations()
returns int
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row public.generations%rowtype;
  v_cost int;
  v_count int := 0;
begin
  select cost_per_generation_cents into v_cost from public.app_config where id = 1;

  for v_row in
    select * from public.generations
     where status in ('queued', 'processing')
       and created_at < now() - interval '30 minutes'
     order by created_at
     limit 500
  loop
    update public.generations
       set status = 'failed',
           error_code = 'provider',
           error_message = 'Le service de rendu n’a pas répondu. Ta coupe t’a été rendue.',
           completed_at = now()
     where id = v_row.id;

    if v_row.created_at >= current_date then
      perform public.release_spend(v_cost);
    end if;

    if v_row.user_id is not null and v_row.credits_cost > 0 then
      perform public.refund_credit(v_row.user_id, v_row.id);
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;

revoke all on function public.sweep_stale_generations() from public, anon, authenticated;
grant execute on function public.sweep_stale_generations() to service_role;
