import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/env';
import { loadProfile, hasPaidAccess } from '@/lib/profile';

/** Le studio, où le verrou du rendu explique lui-même ce qui manque. */
const STUDIO = '/onboarding/photo';

/**
 * Porte des pages qui suivent un rendu — suivi et résultat.
 *
 * Le studio lui-même est ouvert : on y choisit sa photo et ses styles sans
 * rien dépenser. Ces pages-là, en revanche, n'ont aucun sens sans rendu payé.
 *
 * Sans abonnement, on renvoie au studio plutôt qu'à la page tarifs : une
 * grille de prix servie sèchement à quelqu'un qui voulait essayer le produit
 * le fait partir. Au studio, il retrouve sa photo, ses styles, et le cadenas
 * du bouton de rendu lui présente les offres au bon moment. La vérification
 * reste faite dans un server component, jamais côté navigateur.
 */
export async function requirePaidAccess(): Promise<void> {
  if (!isSupabaseConfigured) redirect(STUDIO);

  const session = await loadProfile();
  // `suite` n'est lu nulle part : inutile de le transporter ici.
  if (!session) redirect('/connexion');
  if (!hasPaidAccess(session.profile)) redirect(STUDIO);
}
