-- Catalogue refait sur la liste demandée, et nouvelle famille : la barbe.
--
-- La barbe se change indépendamment de la coupe : c'est une catégorie à part
-- entière, pas une variante de coiffure.
alter type catalog_category add value if not exists 'beard';

-- Retirer un style ne doit pas effacer les coupes déjà générées : elles
-- référencent l'entrée, et la contrainte d'intégrité l'interdit à juste titre.
-- On désactive au lieu de supprimer.
alter table public.catalog_items
  add column if not exists is_active boolean not null default true;

grant select (is_active) on public.catalog_items to anon, authenticated;

create index if not exists catalog_items_active_idx
  on public.catalog_items (is_active, sort_order);

-- Les entrées elles-mêmes sont dans le seed généré depuis lib/catalog.json
-- (node scripts/generate-seed.mjs), rejouable par upsert sur le slug.
