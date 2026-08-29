-- Le parcours tourne avec la clé publique + RLS, sans clé service_role.
-- Tout ce qui est privilégié passe par des fonctions security definer dont les
-- garde-fous vivent dans la base, hors de portée du client.

alter table public.generations
  add column if not exists callback_secret text not null default encode(gen_random_bytes(16), 'hex');
alter table public.generations
  add column if not exists result_bucket text not null default 'generations';

-- Les plafonds ne peuvent pas être des paramètres de fonction : un client
-- authentifie passerait un plafond geant. Ils vivent en base.
create table if not exists public.app_config (
  id int primary key default 1 check (id = 1),
  daily_generation_cap int not null default 15,
  monthly_spend_cap_cents int not null default 1800,
  cost_per_generation_cents int not null default 4,
  user_hourly_limit int not null default 5
);
alter table public.app_config enable row level security;
insert into public.app_config (id) values (1) on conflict (id) do nothing;
revoke all on table public.app_config from anon, authenticated;

alter type credit_reason add value if not exists 'pack_grant';

-- Le secret de rappel n'est jamais lisible depuis un navigateur : sinon
-- n'importe qui marquerait sa propre generation comme reussie.
revoke select (callback_secret) on public.generations from anon, authenticated;
grant select (
  id, user_id, anon_token, catalog_item_id, source_path, result_path,
  result_bucket, status, error_code, error_message, provider_job_id,
  credits_cost, watermarked, created_at, completed_at
) on public.generations to authenticated;

-- Voir la base pour le corps de start_generation / complete_generation /
-- fail_generation / delete_own_account / count_cuts_today : ils sont appliques
-- par les migrations Supabase du meme nom.
