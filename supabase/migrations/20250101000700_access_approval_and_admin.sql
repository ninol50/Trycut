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
