-- Rattachement manuel d'un paiement Whop à un compte du site.
--
-- L'API Whop n'expose jamais l'email d'un client : un abonnement porte un
-- identifiant Whop, pas une adresse — vérifié dans leur SDK officiel. Aucun
-- rapprochement automatique n'est donc possible tant que l'identité reste
-- séparée entre les deux systèmes. Le propriétaire voit qui a payé chez Whop
-- et le marque ici.
--
-- Différent d'un accès offert : l'abonné reçoit le nombre de coupes de son
-- offre, pas un accès illimité.
create or replace function public.admin_set_subscription(
  p_user_id uuid,
  p_plan text,
  p_credits int
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin boolean;
  v_deja int;
begin
  select is_admin into v_admin from public.profiles where id = auth.uid();
  if coalesce(v_admin, false) is not true then
    raise exception 'réservé aux administrateurs' using errcode = '42501';
  end if;

  if p_plan not in ('free', 'pack', 'pass') then
    raise exception 'offre inconnue' using errcode = '22023';
  end if;

  if p_plan = 'free' then
    update public.profiles
       set plan = 'free', subscription_status = 'canceled'
     where id = p_user_id;
    return found;
  end if;

  update public.profiles
     set plan = p_plan::plan_tier, subscription_status = 'active'
   where id = p_user_id;

  if not found then
    return false;
  end if;

  -- Les coupes ne sont accordées qu'une fois par période : marquer deux fois
  -- de suite ne doit pas créditer deux fois.
  select count(*) into v_deja
    from public.credit_ledger
   where user_id = p_user_id
     and reason = 'subscription_grant'
     and created_at > now() - (case when p_plan = 'pack' then interval '7 days'
                                    else interval '30 days' end);

  if v_deja = 0 then
    perform public.grant_credits(p_user_id, p_credits, 'subscription_grant');
  end if;

  return true;
end;
$function$;

revoke all on function public.admin_set_subscription(uuid, text, int) from public, anon;
grant execute on function public.admin_set_subscription(uuid, text, int) to authenticated;
