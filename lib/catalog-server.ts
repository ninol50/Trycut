import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { FALLBACK_CATALOG } from '@/lib/catalog-data';
import type { CatalogItem } from '@/types/db';

export interface CatalogResult {
  items: CatalogItem[];
  /** D'où viennent les entrées. Un repli silencieux casse la génération : les
   *  identifiants du repli sont des slugs, or l'API attend des UUID. */
  source: 'supabase' | 'fallback';
  error: string | null;
}

export async function loadCatalogWithSource(): Promise<CatalogResult> {
  if (!isSupabaseConfigured) {
    return { items: [...FALLBACK_CATALOG], source: 'fallback', error: 'non configuré' };
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('catalog_items')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[catalog] lecture Supabase', error.message);
      return { items: [...FALLBACK_CATALOG], source: 'fallback', error: error.message };
    }
    if (!data || data.length === 0) {
      return { items: [...FALLBACK_CATALOG], source: 'fallback', error: 'catalogue vide' };
    }

    return { items: data as CatalogItem[], source: 'supabase', error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'inconnu';
    console.error('[catalog] lecture Supabase', message);
    return { items: [...FALLBACK_CATALOG], source: 'fallback', error: message };
  }
}

export async function loadCatalog(): Promise<CatalogItem[]> {
  return (await loadCatalogWithSource()).items;
}
