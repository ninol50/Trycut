/**
 * Source de vérité du catalogue (38 entrées, section 6).
 * Les données vivent dans `lib/catalog.json` ; le seed SQL en est généré
 * (`node scripts/generate-seed.mjs`). Sert aussi de repli quand Supabase
 * n'est pas encore configuré.
 */
import type { CatalogItem, PublicCatalogItem } from '@/types/db';
import catalog from '@/lib/catalog.json';

export type CatalogSeed = Omit<CatalogItem, 'id'>;

export const CATALOG_SEED: readonly CatalogSeed[] = catalog as CatalogSeed[];

/**
 * Repli hors Supabase : le slug fait office d'id, et le prompt est retiré —
 * ce repli alimente l'affichage, jamais la génération.
 */
export const FALLBACK_CATALOG: readonly PublicCatalogItem[] = CATALOG_SEED.map((item) => {
  const { prompt_template: _prompt, ...visible } = item;
  return { ...visible, id: item.slug };
});
