export interface Testimonial {
  /** Prénom + initiale, tel que la personne accepte d'être citée. */
  name: string;
  quote: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /**
   * Paire avant/après fournie par la personne, avec son accord écrit.
   * Absente tant que le fichier n'est pas déposé : un avis se lit très bien
   * sans photo, alors qu'une photo attribuée au hasard est un faux.
   */
  before?: string;
  after?: string;
  verified: boolean;
}

/**
 * Avis réellement reçus sur la version précédente du site (trybeforecut.com),
 * repris ici mot pour mot et confirmés par le propriétaire.
 *
 * Cette liste ne doit contenir que des avis réels, de personnes réelles ayant
 * accepté d'être citées. On n'en invente pas, on n'en arrondit pas la note, et
 * on ne coche pas « achat vérifié » sur un avis qui ne l'était pas.
 *
 * Les photos avant/après de ces trois personnes ont été perdues avec le
 * téléphone qui les hébergeait : les avis s'affichent donc en texte seul.
 * Le jour où elles sont retrouvées, il suffit de déposer les fichiers dans
 * /public/avis et de renseigner `before` / `after` — la mise en page les
 * reprend d'elle-même.
 */
export const TESTIMONIALS: readonly Testimonial[] = [
  {
    name: 'Ryan M.',
    quote:
      'J’ai eu les cheveux longs pendant des années et j’avais peur de les couper. Cela m’a montré exactement à quoi je ressemblerais avec une coupe courte. J’ai finalement sauté le pas !',
    rating: 5,
    verified: true,
  },
  {
    name: 'Jamal W.',
    quote:
      'Je pensais à couper mes dreadlocks depuis un moment. Cet aperçu m’a aidé à enfin me décider.',
    rating: 5,
    verified: true,
  },
  {
    name: 'David L.',
    quote:
      'J’ai montré à ma femme à quoi je ressemblerais avec des cheveux et elle n’a pas arrêté de rire. Chaque centime en valait la peine.',
    rating: 5,
    verified: false,
  },
];
