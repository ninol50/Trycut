-- `catalog_items.prompt_template` n'est pas lisible par anon/authenticated :
-- un prompt qui fuit est un prompt qu'on peut détourner. Conséquence pratique :
-- `select('*')` sur cette table échoue en « permission denied » pour le client.
-- Les lectures applicatives nomment donc les colonnes publiques, et le gabarit
-- ne sort qu'au travers de `start_generation`, en security definer.

revoke select (prompt_template) on public.catalog_items from anon, authenticated;

grant select (
  id, slug, label, category, style_tags, preview_path, is_premium, sort_order, created_at
) on public.catalog_items to anon, authenticated;

-- start_generation renvoie le gabarit avec la réservation : voir la migration
-- Supabase `trycut_start_generation_returns_prompt_v2` pour le corps complet.
