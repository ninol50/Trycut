import { createAdminSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export interface RecentCut {
  /** Prénom du compte, tel qu'il l'a saisi. Jamais de nom, jamais d'email. */
  firstName: string;
  /** Horodatage de la génération, en ISO, pour un « il y a X » calculé à l'affichage. */
  at: string;
}

/** Au-delà, l'information n'est plus une activité mais une archive. */
const FENETRE_HEURES = 48;
const MAX = 12;

/**
 * Dernières coupes réellement générées, pour les notifications du bas de page.
 *
 * Aucune invention : un prénom n'apparaît que si le compte existe, qu'il a
 * lancé un rendu, et que ce rendu a abouti. Sans activité, la liste est vide et
 * la bande ne s'affiche pas — c'est le seul état honnête quand personne n'a
 * encore rien fait. Un défilement de prénoms tirés au hasard serait une
 * pratique commerciale trompeuse, pas une preuve.
 *
 * Lecture avec la clé de service parce qu'il n'y a pas de session sur la page
 * d'accueil et que la RLS ferme `generations` à l'anonyme. Rien d'autre ne
 * sort d'ici que le prénom et l'heure : ni identifiant, ni email, ni photo.
 */
export async function loadRecentCuts(): Promise<RecentCut[]> {
  if (!isSupabaseConfigured) return [];

  const admin = createAdminSupabase();
  if (!admin) return [];

  const depuis = new Date(Date.now() - FENETRE_HEURES * 3600 * 1000).toISOString();

  try {
    const { data: rendus, error } = await admin
      .from('generations')
      .select('user_id, completed_at')
      .eq('status', 'succeeded')
      .not('user_id', 'is', null)
      .gte('completed_at', depuis)
      .order('completed_at', { ascending: false })
      .limit(MAX * 2);

    const lignes = (rendus as { user_id: string; completed_at: string }[] | null) ?? [];
    if (error || lignes.length === 0) return [];

    const ids = [...new Set(lignes.map((ligne) => ligne.user_id))];
    const { data: comptes } = await admin
      .from('profiles')
      .select('id, first_name')
      .in('id', ids);

    const prenoms = new Map(
      ((comptes as { id: string; first_name: string | null }[] | null) ?? [])
        .filter((compte) => compte.first_name && compte.first_name.trim().length > 0)
        .map((compte) => [compte.id, compte.first_name as string]),
    );

    const vues = new Set<string>();
    const recentes: RecentCut[] = [];

    for (const ligne of lignes) {
      const prenom = prenoms.get(ligne.user_id);
      // Un compte sans prénom reste muet : « quelqu'un vient de… » n'apprend
      // rien. Et une seule notification par personne, sinon la même passe
      // cinq fois et la bande se dénonce elle-même.
      if (!prenom || vues.has(ligne.user_id)) continue;
      vues.add(ligne.user_id);
      recentes.push({ firstName: prenom.trim(), at: ligne.completed_at });
      if (recentes.length >= MAX) break;
    }

    return recentes;
  } catch {
    return [];
  }
}
