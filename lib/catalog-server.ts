import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { FALLBACK_CATALOG } from '@/lib/catalog-data';
import type { PublicCatalogItem } from '@/types/db';

/** Jamais `select('*')` : `prompt_template` n'est pas lisible par le client,
 *  et une étoile ferait échouer la requête entière en « permission denied ». */
const PUBLIC_COLUMNS = 'id, slug, label, category, style_tags, preview_path, is_premium, sort_order';

export interface CatalogResult {
  items: PublicCatalogItem[];
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
      .select(PUBLIC_COLUMNS)
      // Un style retiré du catalogue reste en base : les coupes déjà générées
      // le référencent et la contrainte d'intégrité interdit de l'effacer.
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[catalog] lecture Supabase', error.message);
      return { items: [...FALLBACK_CATALOG], source: 'fallback', error: error.message };
    }
    if (!data || data.length === 0) {
      return { items: [...FALLBACK_CATALOG], source: 'fallback', error: 'catalogue vide' };
    }

    return { items: data as PublicCatalogItem[], source: 'supabase', error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'inconnu';
    console.error('[catalog] lecture Supabase', message);
    return { items: [...FALLBACK_CATALOG], source: 'fallback', error: message };
  }
}

export async function loadCatalog(): Promise<PublicCatalogItem[]> {
  return (await loadCatalogWithSource()).items;
}
