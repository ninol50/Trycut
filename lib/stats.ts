import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * Nombre réel de coupes générées aujourd'hui.
 * Retourne null si la donnée n'est pas lisible — la preuve sociale n'est
 * jamais affichée à partir d'un chiffre inventé.
 */
export async function countCutsToday(): Promise<number | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.rpc('count_cuts_today');

    if (error || typeof data !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}
