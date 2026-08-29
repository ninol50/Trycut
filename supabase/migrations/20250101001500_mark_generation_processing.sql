-- La table generations n'a qu'une politique de LECTURE. L'application y écrivait
-- pourtant directement le passage en « rendu en cours » : la RLS filtrait la
-- mise à jour, zéro ligne touchée, et aucune erreur levée. La coupe restait
-- « en attente » pour toujours, débitée, et l'écran de suivi tournait sans fin.
--
-- Observé trois fois en production, sur des demandes que le fournisseur avait
-- pourtant acceptées (POST /api/generations en 200). Le droit UPDATE au niveau
-- colonne accordé par la migration 000800 ne servait donc à rien : sans
-- politique RLS correspondante, il ne s'applique jamais.
--
-- Le correctif passe par une fonction qui vérifie la propriété de la ligne,
-- plutôt que d'ouvrir une politique d'écriture sur la table entière.
create or replace function public.mark_generation_processing(
  p_generation_id uuid,
  p_job_id text
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return false;
  end if;

  update public.generations
     set status = 'processing',
         provider_job_id = p_job_id
   where id = p_generation_id
     and user_id = v_uid
     and status = 'queued';

  return found;
end;
$function$;

revoke all on function public.mark_generation_processing(uuid, text) from public, anon;
grant execute on function public.mark_generation_processing(uuid, text) to authenticated;

-- Ce droit colonne n'a jamais eu d'effet, faute de politique RLS. On l'enlève
-- pour que personne ne croie que l'écriture directe fonctionne.
revoke update on table public.generations from anon, authenticated;
