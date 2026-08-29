import { createAdminSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/**
 * Nombre réel de coupes générées aujourd'hui.
 * Retourne null si la donnée n'est pas lisible — la preuve sociale n'est
 * jamais affichée à partir d'un chiffre inventé.
 */
export async function countCutsToday(): Promise<number | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const admin = createAdminSupabase();
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);

    const { count, error } = await admin
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'succeeded')
      .gte('created_at', since.toISOString());

    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}
