-- Le secret du webhook Whop peut être posé depuis la page admin du site, sans
-- passer par le tableau de bord de l'hébergeur — inutilisable depuis un
-- téléphone. app_config n'est accessible qu'au service_role et la RLS y est
-- active : le secret y est aussi protégé qu'une variable d'environnement.
alter table public.app_config add column if not exists whop_webhook_secret text;

comment on column public.app_config.whop_webhook_secret is
  'Secret de signature du webhook Whop. Jamais renvoyé au navigateur : seule sa présence est exposée.';

create or replace function public.admin_set_whop_secret(p_secret text)
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

  update public.app_config
     set whop_webhook_secret = nullif(btrim(p_secret), '')
   where id = 1;

  return found;
end;
$function$;

create or replace function public.admin_has_whop_secret()
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin boolean;
  v_secret text;
begin
  select is_admin into v_admin from public.profiles where id = auth.uid();
  if coalesce(v_admin, false) is not true then
    raise exception 'réservé aux administrateurs' using errcode = '42501';
  end if;

  select whop_webhook_secret into v_secret from public.app_config where id = 1;
  return v_secret is not null and length(v_secret) > 0;
end;
$function$;

revoke all on function public.admin_set_whop_secret(text) from public, anon;
revoke all on function public.admin_has_whop_secret() from public, anon;
grant execute on function public.admin_set_whop_secret(text) to authenticated;
grant execute on function public.admin_has_whop_secret() to authenticated;
