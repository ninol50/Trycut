/**
 * Source de vérité du catalogue (38 entrées, section 6).
 * Les données vivent dans `lib/catalog.json` ; le seed SQL en est généré
 * (`node scripts/generate-seed.mjs`). Sert aussi de repli quand Supabase
 * n'est pas encore configuré.
 */
import type { CatalogItem } from '@/types/db';
import catalog from '@/lib/catalog.json';

export type CatalogSeed = Omit<CatalogItem, 'id'>;

export const CATALOG_SEED: readonly CatalogSeed[] = catalog as CatalogSeed[];

/** Identifiants stables hors Supabase : le slug fait office d'id. */
export const FALLBACK_CATALOG: readonly CatalogItem[] = CATALOG_SEED.map((item) => ({
  ...item,
  id: item.slug,
}));
