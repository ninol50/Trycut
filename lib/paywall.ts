import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/env';
import { loadProfile, hasPaidAccess } from '@/lib/profile';

/**
 * Porte du produit, à appeler en tête de chaque page qui montre le studio ou
 * le catalogue.
 *
 * Sans abonnement actif, il n'y a pas d'accès : on renvoie vers les offres
 * plutôt que d'afficher un studio inutilisable. La vérification est faite dans
 * un server component, jamais côté navigateur.
 */
export async function requirePaidAccess(): Promise<void> {
  if (!isSupabaseConfigured) redirect('/tarifs');

  const session = await loadProfile();
  if (!session) redirect('/connexion?suite=tarifs');
  if (!hasPaidAccess(session.profile)) redirect('/tarifs');
}
