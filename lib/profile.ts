import { createServerSupabase, getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { Generation, Profile } from '@/types/db';

/**
 * Chargement du profil côté serveur. Aucune route protégée ne rend
 * de contenu premium avant ce passage.
 */
export async function loadProfile(): Promise<{ user: { id: string; email: string }; profile: Profile } | null> {
  if (!isSupabaseConfigured) return null;

  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createServerSupabase();
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  const profile = data as Profile | null;
  if (!profile) return null;

  return { user: { id: user.id, email: user.email ?? profile.email }, profile };
}

export type HistoryRow = Pick<Generation, 'id' | 'status' | 'created_at' | 'completed_at'>;

export async function loadHistory(userId: string, limit = 12): Promise<HistoryRow[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('generations')
    .select('id, status, created_at, completed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data as HistoryRow[] | null) ?? [];
}

/** Le catalogue premium est réservé au plan `pass`. */
export function premiumLocked(profile: Profile): boolean {
  return !(profile.plan === 'pass' && profile.subscription_status === 'active');
}

/** Le filigrane disparaît sur les offres payantes actives. */
export function watermarkFor(profile: Profile): boolean {
  return !(
    (profile.plan === 'pack' || profile.plan === 'pass') &&
    profile.subscription_status === 'active'
  );
}

/**
 * Accès au produit : réservé aux abonnements actifs.
 *
 * Sans paiement, rien n'est accessible — ni le studio photo, ni le catalogue.
 * Le compte existe pour recevoir l'abonnement, pas pour en faire l'essai.
 * Les administrateurs passent, sinon le propriétaire du site ne pourrait plus
 * regarder son propre produit.
 */
export function hasPaidAccess(profile: Profile): boolean {
  if (profile.access_status === 'rejected') return false;

  // Accès offert à la main depuis /admin, et administrateurs : ils entrent sans
  // payer. Tous les autres passent par un abonnement actif.
  if (profile.is_admin || profile.access_status === 'granted') return true;

  return (
    (profile.plan === 'pack' || profile.plan === 'pass') &&
    profile.subscription_status === 'active'
  );
}
