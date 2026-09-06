import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/env';
import { loadProfile, hasPaidAccess } from '@/lib/profile';

/**
 * Porte du produit, à appeler en tête de chaque page qui consomme réellement
 * quelque chose : un rendu lancé, un résultat affiché.
 *
 * Sans abonnement actif, il n'y a rien à voir là : on renvoie vers les offres.
 * La vérification est faite dans un server component, jamais côté navigateur.
 */
export async function requirePaidAccess(): Promise<void> {
  if (!isSupabaseConfigured) redirect('/tarifs');

  const session = await loadProfile();
  if (!session) redirect('/connexion?suite=tarifs');
  if (!hasPaidAccess(session.profile)) redirect('/tarifs');
}

/**
 * Porte du studio : un compte suffit.
 *
 * Le studio se prépare sans abonnement — la photo reste dans le navigateur,
 * aucun crédit n'est réservé, aucun fichier n'est déposé. Le paiement se
 * demande au moment de générer, quand la personne sait exactement ce qu'elle
 * achète. C'est `hasPaidAccess`, côté serveur, qui décide de ce qui part
 * ensuite : `/api/uploads` et `start_generation` refusent toujours un compte
 * sans abonnement, quoi que le navigateur raconte.
 */
export async function requireAccount(): Promise<void> {
  if (!isSupabaseConfigured) redirect('/tarifs');

  const session = await loadProfile();
  if (!session) redirect('/connexion');
}
