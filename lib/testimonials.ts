/**
 * Visualisations cumulées depuis le début, sites successifs confondus :
 * chiffre déclaré par le propriétaire, repris de son site précédent — même
 * produit, mêmes clients. Ce n'est ni une estimation ni `count_cuts_today`,
 * qui compte la journée en cours dans cette base.
 *
 * Posé ici et non dans `lib/stats.ts` : la vitrine le lit depuis un composant
 * client, et `lib/stats.ts` ouvre Supabase, donc `next/headers`.
 */
export const VISUALISATIONS_CUMULEES = 4500;

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
 * Avis réels, repris du site précédent du même propriétaire — mêmes clients,
 * même produit. Rien n'est écrit ici qui n'ait été publié là-bas : citation,
 * note, mention « achat vérifié » et photos avant/après.
 *
 * La règle qui a laissé cette liste vide si longtemps ne change pas : on
 * n'ajoute pas un avis qu'on n'a pas reçu. Un rendu généré pour l'occasion,
 * un prénom choisi parce qu'il sonne bien, une étoile ajoutée pour arrondir —
 * rien de tout cela n'entre ici. Et jamais de personnalité publique : une
 * photo librement accessible n'est pas un accord, et montrer une célébrité
 * avec une coupe générée lui fait dire qu'elle utilise le produit.
 */
export const TESTIMONIALS: readonly Testimonial[] = [
  {
    name: 'Ryan M.',
    quote:
      'J’ai eu les cheveux longs pendant des années et j’avais peur de les couper. Cela m’a montré exactement à quoi je ressemblerais avec une coupe courte. J’ai finalement sauté le pas !',
    rating: 5,
    before: '/avis/ryan-avant.jpg',
    after: '/avis/ryan-apres.jpg',
    verified: true,
  },
  {
    name: 'Jamal W.',
    quote:
      'Je pensais à couper mes dreadlocks depuis un moment. Cet aperçu m’a aidé à enfin me décider.',
    rating: 5,
    before: '/avis/jamal-avant.jpg',
    after: '/avis/jamal-apres.jpg',
    verified: true,
  },
  {
    name: 'David L.',
    quote:
      'J’ai montré à ma femme à quoi je ressemblerais avec des cheveux et elle n’a pas arrêté de rire. Chaque centime en valait la peine.',
    rating: 5,
    before: '/avis/david-avant.jpg',
    after: '/avis/david-apres.jpg',
    verified: false,
  },
];
