-- Clé API Whop, posée depuis la page admin comme le secret du webhook.
--
-- Elle sert à interroger Whop plutôt qu'à attendre qu'il nous prévienne :
-- l'accès au site colle alors en permanence à l'état réel de l'abonnement,
-- sans dépendre d'un message qui peut se perdre.
alter table public.app_config add column if not exists whop_api_key text;

comment on column public.app_config.whop_api_key is
  'Clé API Whop. Jamais renvoyée au navigateur : seule sa présence est exposée.';

create or replace function public.admin_set_whop_api_key(p_key text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin boolean;
begin
  select is_admin into v_admin from public.profiles where id = auth.uid();
  if coalesce(v_admin, false) is not true then
    raise exception 'réservé aux administrateurs' using errcode = '42501';
  end if;

  update public.app_config set whop_api_key = nullif(btrim(p_key), '') where id = 1;
  return found;
end;
$function$;

create or replace function public.admin_whop_status()
returns table (secret_pose boolean, cle_api_posee boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin boolean;
begin
  select is_admin into v_admin from public.profiles where id = auth.uid();
  if coalesce(v_admin, false) is not true then
    raise exception 'réservé aux administrateurs' using errcode = '42501';
  end if;

  return query
    select coalesce(length(whop_webhook_secret), 0) > 0,
           coalesce(length(whop_api_key), 0) > 0
      from public.app_config where id = 1;
end;
$function$;

revoke all on function public.admin_set_whop_api_key(text) from public, anon;
revoke all on function public.admin_whop_status() from public, anon;
grant execute on function public.admin_set_whop_api_key(text) to authenticated;
grant execute on function public.admin_whop_status() to authenticated;
