export interface Testimonial {
  /** Prénom + initiale, tel que la personne accepte d'être citée. */
  name: string;
  quote: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** Paire avant/après fournie par la personne, avec son accord écrit. */
  before: string;
  after: string;
  verified: boolean;
}

/**
 * VIDE VOLONTAIREMENT.
 *
 * Cette liste ne doit contenir que des avis réellement reçus, de personnes
 * réelles ayant accepté d'être citées et d'afficher leur photo. Tant qu'elle
 * est vide, la section ne s'affiche pas — plutôt que d'inventer des noms,
 * des notes et des « achats vérifiés » qui n'existent pas.
 */
export const TESTIMONIALS: readonly Testimonial[] = [];
