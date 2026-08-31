-- Réglages Stripe posés depuis la page admin du site, plus depuis l'hébergeur.
--
-- Motif : le propriétaire travaille depuis un téléphone. Poser une variable
-- d'environnement suppose le tableau de bord de l'hébergeur puis un
-- redéploiement, et une variable qui n'arrive pas jusqu'au serveur ne le dit
-- pas — constaté en production, où neuf variables affichées côté hébergeur
-- n'étaient jamais reçues par le site.
--
-- `app_config` n'est lisible que par le service_role, RLS active : la clé y
-- est aussi protégée que dans une variable d'environnement.
alter table public.app_config
  add column if not exists stripe_secret_key text,
  add column if not exists stripe_webhook_secret text,
  add column if not exists stripe_price_pack text,
  add column if not exists stripe_price_pass text,
  add column if not exists stripe_price_trimestre text;

comment on column public.app_config.stripe_secret_key is
  'Clé secrète Stripe. Jamais renvoyée au navigateur : seule sa présence est exposée.';
comment on column public.app_config.stripe_webhook_secret is
  'Secret de signature du webhook Stripe, écrit par la configuration automatique.';

-- Troisième offre payante : abonnement trimestriel.
alter type public.plan_tier add value if not exists 'trimestre';

create or replace function public.admin_set_stripe_key(p_key text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin boolean;
  v_jeton text;
begin
  select is_admin into v_admin from public.profiles where id = auth.uid();
  if coalesce(v_admin, false) is not true then
    raise exception 'réservé aux administrateurs' using errcode = '42501';
  end if;

  -- Coller depuis un téléphone ramène presque toujours du texte autour de la
  -- clé : on extrait le jeton plutôt que de faire confiance au presse-papier.
  v_jeton := public.extraire_jeton(p_key, 'sk_');
  if v_jeton is null or v_jeton = '' then
    raise exception 'clé Stripe illisible' using errcode = '22023';
  end if;

  update public.app_config set stripe_secret_key = v_jeton where id = 1;
  return found;
end;
$function$;

-- Retirer la clé : le seul moyen de couper les paiements sans redéployer.
create or replace function public.admin_clear_stripe_key()
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
     set stripe_secret_key = null,
         stripe_webhook_secret = null,
         stripe_price_pack = null,
         stripe_price_pass = null,
         stripe_price_trimestre = null
   where id = 1;
  return found;
end;
$function$;

drop function if exists public.admin_stripe_status();

create function public.admin_stripe_status()
returns table (
  cle_posee boolean,
  secret_webhook_pose boolean,
  prix_poses integer,
  mode_test boolean
)
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
    select coalesce(length(stripe_secret_key), 0) > 0,
           coalesce(length(stripe_webhook_secret), 0) > 0,
           (case when coalesce(length(stripe_price_pack), 0) > 0 then 1 else 0 end
            + case when coalesce(length(stripe_price_pass), 0) > 0 then 1 else 0 end
            + case when coalesce(length(stripe_price_trimestre), 0) > 0 then 1 else 0 end),
           coalesce(stripe_secret_key like 'sk_test_%', false)
      from public.app_config where id = 1;
end;
$function$;

revoke all on function public.admin_set_stripe_key(text) from public, anon;
revoke all on function public.admin_clear_stripe_key() from public, anon;
revoke all on function public.admin_stripe_status() from public, anon;
grant execute on function public.admin_set_stripe_key(text) to authenticated;
grant execute on function public.admin_clear_stripe_key() to authenticated;
grant execute on function public.admin_stripe_status() to authenticated;
