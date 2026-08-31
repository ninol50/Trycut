-- Coller une clé depuis un téléphone ramène presque toujours du texte autour :
-- son nom, un retour à la ligne, le libellé de la colonne. Whop refuse alors
-- une clé qui n'existe pas, et son message d'erreur ne dit pas pourquoi.
--
-- On extrait donc le jeton lui-même plutôt que de faire confiance au
-- presse-papier. Vu en production : une clé de 93 caractères contenant un
-- espace, là où le jeton en fait 58.
create or replace function public.extraire_jeton(p_texte text, p_prefixe text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select coalesce(
    substring(p_texte from '(' || p_prefixe || '[A-Za-z0-9_-]+)'),
    nullif(split_part(btrim(p_texte), ' ', 1), '')
  );
$function$;

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

  update public.app_config
     set whop_api_key = nullif(public.extraire_jeton(p_key, 'apik_'), '')
   where id = 1;

  return found;
end;
$function$;

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
     set whop_webhook_secret = nullif(public.extraire_jeton(p_secret, 'ws_'), '')
   where id = 1;

  return found;
end;
$function$;
