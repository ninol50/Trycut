-- Accès sur approbation. Personne ne génère avant validation manuelle, et un
-- paiement refusé retire l'accès sans effacer les coupes restantes.
--
-- Corps complet des fonctions : voir les migrations Supabase
-- `trycut_access_approval_and_admin`, `trycut_protect_profile_columns_fix`
-- et `trycut_gate_and_admin_functions`.

do $$ begin
  create type access_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists access_status access_status not null default 'pending';
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists reviewed_at timestamptz;

-- Les administrateurs sont désignés par email, en base : rien à redéployer
-- pour en ajouter un, et un client ne peut pas s'auto-promouvoir.
alter table public.app_config
  add column if not exists admin_emails text[] not null default '{}';

-- Un compte ne peut pas modifier son statut, ses crédits ni son offre.
-- Le garde-fou teste `current_user` et non le GUC `role` : dans une fonction
-- security definer, `role` reste 'authenticated' et le débit de crédit aurait
-- été annulé.

-- Le garde-fou doit être `security invoker`. En `security definer`, `current_user`
-- vaut le propriétaire de la fonction et jamais 'authenticated' : la condition
-- n'est jamais vraie, et un compte peut se déclarer administrateur puis se
-- créditer lui-même. Vérifié par une tentative réelle sous le rôle authenticated.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.access_status := old.access_status;
    new.is_admin := old.is_admin;
    new.credits_remaining := old.credits_remaining;
    new.plan := old.plan;
    new.subscription_status := old.subscription_status;
    new.stripe_customer_id := old.stripe_customer_id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();
