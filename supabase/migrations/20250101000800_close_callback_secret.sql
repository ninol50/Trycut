-- Le secret de rappel était lisible par le titulaire du compte.
--
-- La migration 000500 faisait `revoke select (callback_secret)`, mais un revoke
-- colonne ne retire rien tant que le rôle garde un SELECT sur la table entière,
-- et Supabase accorde ce SELECT par défaut. Le revoke n'a donc jamais eu d'effet.
--
-- Conséquence, vérifiée par une attaque réelle sous le rôle authenticated : un
-- compte lisait le secret de sa coupe en cours, appelait fail_generation, et se
-- faisait rembourser son crédit pendant que le rendu se terminait. Coupes
-- gratuites à volonté.
--
-- On coupe donc au niveau table, puis on rend colonne par colonne le strict
-- nécessaire. Un futur `grant ... on table` ferait retomber dans le même piège.

revoke all on table public.generations from anon, authenticated;

-- Lecture : tout sauf callback_secret et client_ip. La RLS limite déjà aux
-- lignes de l'appelant ; ceci limite les colonnes.
grant select (
  id, user_id, guest_id, anon_token, catalog_item_id, source_path, result_path,
  result_bucket, status, error_code, error_message, provider_job_id,
  credits_cost, watermarked, created_at, completed_at
) on public.generations to anon, authenticated;

-- Écriture : uniquement le passage en « rendu en cours », fait par la route
-- serveur avec la session de la personne. Le reste du cycle de vie appartient
-- à complete_generation / fail_generation, qui exigent le secret.
grant update (status, provider_job_id) on public.generations to anon, authenticated;
