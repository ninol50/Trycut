import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { CATALOG_PUBLIC_COLUMNS, toView } from '@/lib/catalog';
import type { CatalogItemView } from '@/lib/catalog';
import type { CatalogItem } from '@/lib/types/db';

type PublicRow = Pick<
  CatalogItem,
  'id' | 'slug' | 'label' | 'category' | 'style_tags' | 'preview_path' | 'is_premium'
>;

/**
 * Chargement du catalogue côté serveur.
 *
 * Deux choix ici :
 *  - `prompt_template` n'est jamais sélectionné — le prompt ne quitte pas le
 *    serveur, et le client ne renvoie qu'un identifiant ;
 *  - le client est créé sans cookies (le catalogue est en lecture publique),
 *    ce qui laisse les pages qui l'appellent être mises en cache et
 *    revalidées, au lieu d'être rendues à chaque requête pour rien.
 *
 * En l'absence de configuration Supabase (premier `npm run dev` avant le
 * `.env.local`), on renvoie une liste vide plutôt que de casser la page.
 */
export async function loadCatalog(): Promise<CatalogItemView[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  try {
    const supabase = createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from('catalog_items')
      .select(CATALOG_PUBLIC_COLUMNS)
      .order('sort_order', { ascending: true })
      .returns<PublicRow[]>();

    if (error || !data) {
      if (error) console.error('[catalog] chargement impossible', error.message);
      return [];
    }
    return data.map(toView);
  } catch (error) {
    console.error('[catalog] chargement impossible', error);
    return [];
  }
}
