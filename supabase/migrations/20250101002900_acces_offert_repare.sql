-- « Offrir l'accès » ne tenait pas : la fonction en base refusait la valeur.
--
-- `admin_set_access` date de l'époque où `access_status` ne connaissait que
-- 'pending', 'approved' et 'rejected'. La valeur 'granted' est arrivée ensuite
-- (20250101002000) sans que la fonction soit reprise : l'appel levait une
-- exception, l'API rendait 500, et l'écran /admin annulait la ligne qu'il
-- venait d'afficher. Vu du propriétaire, l'accès offert disparaissait dans la
-- seconde, à chaque tentative — exactement le symptôme signalé.
--
-- La fonction est reconstruite au lieu d'être corrigée par substitution : son
-- corps n'a jamais vécu dans ce dépôt, donc rien ne garantit ce qu'il contient
-- aujourd'hui. Les anciennes signatures sont supprimées d'abord — laisser une
-- surcharge rendrait l'appel PostgREST ambigu, c'est-à-dire cassé pour de bon.
-- Rejouer ce script est sans effet.

alter type access_status add value if not exists 'granted';

do $$
declare
  v_signature text;
begin
  for v_signature in
    select p.oid::regprocedure::text
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'admin_set_access'
  loop
    execute 'drop function ' || v_signature;
  end loop;
end
$$;

create function public.admin_set_access(p_user_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin boolean;
begin
  -- Le contrôle vit ici et non dans l'application : une route oubliée ne doit
  -- pas suffire à changer le statut d'un compte.
  select is_admin into v_admin from public.profiles where id = auth.uid();
  if coalesce(v_admin, false) is not true then
    raise exception 'réservé aux administrateurs' using errcode = '42501';
  end if;

  -- Les quatre valeurs de l'énumération, 'granted' comprise. Une liste écrite
  -- à la main est précisément ce qui a cassé ; celle-ci est la liste complète.
  if p_status not in ('pending', 'approved', 'granted', 'rejected') then
    raise exception 'statut inconnu' using errcode = '22023';
  end if;

  update public.profiles
     set access_status = p_status::access_status,
         reviewed_at = now()
   where id = p_user_id;

  -- `false` quand l'identifiant ne correspond à personne : l'écran doit
  -- pouvoir distinguer « rien n'a changé » de « c'est fait ».
  return found;
end;
$function$;

revoke all on function public.admin_set_access(uuid, text) from public, anon;
grant execute on function public.admin_set_access(uuid, text) to authenticated;

-- Un accès offert ne consomme pas de coupe : c'est `start_generation` qui le
-- sait. Si la fonction déployée ignore 'granted', le compte passerait la porte
-- d'/admin pour se faire refuser au moment de générer, faute de solde. On ne
-- réécrit pas une fonction de cette taille à l'aveugle : on prévient.
do $$
declare
  v_def text;
begin
  for v_def in
    select pg_get_functiondef(p.oid)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'start_generation'
  loop
    if position('granted' in v_def) = 0 then
      raise warning 'start_generation ignore l''accès offert : ces comptes seront refusés faute de coupes.';
    end if;
  end loop;
end
$$;

-- PostgREST garde en mémoire la liste des fonctions : sans ce signal, l'API
-- continuerait d'appeler celle qui vient d'être supprimée.
notify pgrst, 'reload schema';
