import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { FALLBACK_CATALOG } from '@/lib/catalog-data';
import type { CatalogItem } from '@/types/db';

/**
 * Lecture du catalogue. Repli sur les données statiques si Supabase n'est pas
 * encore branché : la landing et l'onboarding restent parcourables.
 */
export async function loadCatalog(): Promise<CatalogItem[]> {
  if (!isSupabaseConfigured) return [...FALLBACK_CATALOG];

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('catalog_items')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) return [...FALLBACK_CATALOG];
    return data as CatalogItem[];
  } catch {
    return [...FALLBACK_CATALOG];
  }
}
