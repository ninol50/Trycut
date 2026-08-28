-- Buckets privés. Aucun accès direct : uniquement par URL signée 60s
-- générée après vérification serveur de la propriété de la ligne.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('selfies', 'selfies', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('generations', 'generations', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Un utilisateur connecté ne touche qu'à son propre préfixe {user_id}/...
drop policy if exists selfies_insert_own on storage.objects;
create policy selfies_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'selfies'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists selfies_select_own on storage.objects;
create policy selfies_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'selfies'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists selfies_delete_own on storage.objects;
create policy selfies_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'selfies'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists generations_select_own on storage.objects;
create policy generations_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'generations'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Aucune policy anon : les uploads de l'essai gratuit passent par le service role
-- (route serveur), jamais par le client.
