-- Une coupe pouvait rester « en cours » indéfiniment, débitée et jamais rendue.
--
-- Vu en production : une génération est restée en 'queued' cinq minutes, sans
-- identifiant de tâche côté fournisseur. Si l'appel au fournisseur n'aboutit
-- pas et que le code n'atteint pas fail_generation, plus rien ne touche la
-- ligne — le rappel du fournisseur n'arrivera jamais. L'écran de suivi tourne
-- à 92 % pour toujours et la coupe est perdue.
--
-- L'écran de suivi appelle désormais cette fonction. Elle n'agit que sur la
-- ligne de l'appelant et seulement au-delà du délai : impossible d'annuler une
-- coupe en cours pour récupérer son crédit à volonté.
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
  perform public.release_spend(v_cost);
  perform public.refund_credit(v_row.user_id, p_generation_id);

  return true;
end;
$function$;

revoke all on function public.expire_stale_generation(uuid) from public, anon;
grant execute on function public.expire_stale_generation(uuid) to authenticated;
