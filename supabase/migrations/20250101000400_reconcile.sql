-- Réconciliation avec une base déjà créée par une itération antérieure.
-- Strictement additif : aucune colonne, table ou policy existante n'est supprimée.
-- Sur une base neuve, tout est déjà en place et cette migration ne fait rien.

-- Essai anonyme : le brief (section 8) impose `anon_token`.
alter table public.generations add column if not exists anon_token text;
alter table public.generations add column if not exists client_ip text;
alter table public.generations add column if not exists watermarked boolean not null default true;

create index if not exists generations_anon_idx on public.generations(anon_token);
create index if not exists generations_client_ip_idx
  on public.generations(client_ip, created_at desc);

-- `catalog_item_id` peut être null si un item est retiré du catalogue.
alter table public.generations alter column catalog_item_id drop not null;

-- Déclaration d'âge (section 9) : conservée sur le profil.
alter table public.profiles add column if not exists age_confirmed boolean not null default false;

-- Le trigger de création de profil propage la déclaration d'âge et le prénom.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, age_confirmed)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce((new.raw_user_meta_data ->> 'age_confirmed')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Verrouillage identique après redéfinition de handle_new_user.
revoke all on function public.handle_new_user() from public, anon, authenticated;
