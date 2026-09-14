import { createAdminSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

/** Au-delà, ce n'est plus de l'activité mais une archive. */
const FENETRE_HEURES = 48;
const MAX = 12;

/**
 * Horodatages des dernières coupes réellement générées, pour la bande de
 * notifications du bas de page.
 *
 * Aucune invention : une ligne n'existe que si un rendu a abouti. Sans
 * activité, la liste est vide et la bande ne s'affiche pas — c'est le seul
 * état honnête quand personne n'a encore rien fait. Un défilement d'annonces
 * fabriquées serait une pratique commerciale trompeuse, pas une preuve.
 *
 * Seule l'heure sort d'ici. Ni prénom, ni identifiant, ni photo, ni résultat :
 * personne n'a à être désigné pour que l'activité du site se voie.
 *
 * Lecture avec la clé de service parce que la page d'accueil n'a pas de
 * session et que la RLS ferme `generations` à l'anonyme.
 */
export async function loadRecentCuts(): Promise<string[]> {
  if (!isSupabaseConfigured) return [];

  const admin = createAdminSupabase();
  if (!admin) return [];

  const depuis = new Date(Date.now() - FENETRE_HEURES * 3600 * 1000).toISOString();

  try {
    const { data, error } = await admin
      .from('generations')
      .select('completed_at')
      .eq('status', 'succeeded')
      .gte('completed_at', depuis)
      .order('completed_at', { ascending: false })
      .limit(MAX);

    if (error) return [];

    return ((data as { completed_at: string | null }[] | null) ?? [])
      .map((ligne) => ligne.completed_at)
      .filter((at): at is string => Boolean(at));
  } catch {
    return [];
  }
}
