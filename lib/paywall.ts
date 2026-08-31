import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/env';
import { loadProfile, hasPaidAccess } from '@/lib/profile';
import { syncAccessFromWhop } from '@/lib/whop-sync';

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

  // On demande à Whop l'état réel de l'abonnement avant de décider. C'est ce
  // qui ouvre l'accès juste après un paiement, et ce qui le referme dès qu'un
  // paiement est refusé — sans dépendre d'un message qui peut se perdre.
  await syncAccessFromWhop(session.profile);

  const frais = await loadProfile();
  if (!frais || !hasPaidAccess(frais.profile)) redirect('/tarifs');
}
