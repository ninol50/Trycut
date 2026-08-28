-- Rate limit par IP (section 7.4) : la colonne n'existe pas dans le modèle
-- de la section 8, elle est purement opérationnelle et purgée avec la ligne.
alter table public.generations
  add column if not exists client_ip text;

create index if not exists generations_client_ip_idx
  on public.generations(client_ip, created_at desc);
