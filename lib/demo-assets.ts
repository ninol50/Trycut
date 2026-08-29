import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Les visuels de démo ne sont pas générés par le code (voir /public/demo/README.md).
 * On vérifie leur présence côté serveur au rendu : absents, on rend un placeholder
 * aux dimensions explicites. La page ne doit jamais casser ni décaler.
 */
export function hasPublicAsset(relativePath: string): boolean {
  try {
    return existsSync(join(process.cwd(), 'public', relativePath.replace(/^\//, '')));
  } catch {
    return false;
  }
}

export interface ExamplePairAsset {
  /** Coupe montrée par la paire. */
  slug: string;
  label: string;
}

/**
 * Paires avant/après de la section « Le rendu, avant le coup de ciseaux ».
 *
 * Fichiers attendus, par coupe :
 *   /public/exemples/{slug}-avant.jpg
 *   /public/exemples/{slug}-apres.jpg
 *
 * Une paire n'apparaît que si les deux fichiers sont là — une moitié de paire
 * ne montre rien. La section entière se cache si aucune paire n'est complète,
 * plutôt que d'aligner des cadres vides.
 *
 * Ce qui rend ces paires convaincantes : le même visage, le même mur, le même
 * vêtement, le même cadrage. Seuls les cheveux changent. Le plus simple est de
 * passer la photo « avant » dans Trycut et de reprendre le résultat tel quel.
 */
export const EXAMPLE_PAIRS: readonly ExamplePairAsset[] = [
  // La première paire complète devient le comparateur que l'on fait glisser :
  // mettre en tête celle dont les deux images viennent de la même photo, donc
  // parfaitement superposées.
  { slug: 'cut-permanente-courte', label: 'Cheveux bouclés' },
  { slug: 'cut-locks', label: 'Locks' },
  { slug: 'cut-afro-court', label: 'Afro court' },
  { slug: 'cut-permanente-mi-longue', label: 'Cheveux bouclés mi-longs' },
  { slug: 'cut-buzz', label: 'Buzz cut' },
  { slug: 'cut-degrade-espagnol', label: 'Dégradé espagnol' },
  { slug: 'cut-chauve', label: 'Crâne rasé' },
] as const;

export interface ResolvedExample {
  slug: string;
  before: string;
  after: string;
  label: string;
}

/** Ne renvoie que les paires complètes : une demi-paire ne prouve rien. */
export function resolveExamples(): readonly ResolvedExample[] {
  return EXAMPLE_PAIRS.flatMap((pair) => {
    const before = `/exemples/${pair.slug}-avant.jpg`;
    const after = `/exemples/${pair.slug}-apres.jpg`;

    if (!hasPublicAsset(before) || !hasPublicAsset(after)) return [];
    return [{ slug: pair.slug, before, after, label: pair.label }];
  });
}

// ------------------------------------------------------------------ hero
/**
 * Le hero enchaîne des personnes, et pour chacune plusieurs coupes.
 *
 * Tant qu'aucune photo n'est déposée, tout est dessiné et il n'y a qu'une
 * silhouette : afficher quatre fois le même dessin en le présentant comme
 * quatre personnes différentes n'aurait aucun sens.
 *
 * Pour passer en photo, déposer par personne :
 *   /public/hero/{id}.jpg          le visage de départ
 *   /public/hero/{id}-{slug}.jpg   le même visage avec la coupe
 *
 * Une personne n'apparaît en photo que si son départ et au moins une de ses
 * coupes sont présents ; les autres sont ignorées. On ne panache jamais une
 * photo d'un côté du séparateur et un dessin de l'autre.
 *
 * Ces photos doivent montrer des personnes qui ont donné leur accord écrit, ou
 * des visages générés de personnes qui n'existent pas. Un visage identifiable
 * sur une page qui vend un abonnement engage la responsabilité du site.
 */
export interface HeroLookAsset {
  slug: string;
  label: string;
}

export interface HeroPersonAsset {
  /** Préfixe des fichiers dans /public/hero. */
  id: string;
  /** Coupe de départ, utilisée pour le dessin faute de photo. */
  baseSlug: string;
  looks: readonly HeroLookAsset[];
}

const CHAUVE = { slug: 'cut-chauve', label: 'Crâne rasé' } as const;
const BUZZ = { slug: 'cut-buzz', label: 'Buzz cut' } as const;
const LOCKS = { slug: 'cut-locks', label: 'Locks' } as const;
const TRESSES = { slug: 'cut-tresses', label: 'Tresses' } as const;
const AFRO = { slug: 'cut-afro-court', label: 'Afro court' } as const;
const BOUCLES = { slug: 'cut-permanente-mi-longue', label: 'Cheveux bouclés mi-longs' } as const;
const MIDDLE = { slug: 'cut-middle-part', label: 'Middle part' } as const;
const ESPAGNOL = { slug: 'cut-degrade-espagnol', label: 'Dégradé espagnol' } as const;

export const HERO_PEOPLE: readonly HeroPersonAsset[] = [
  { id: 'personne-1', baseSlug: 'cut-cheveux-longs', looks: [CHAUVE, BUZZ, ESPAGNOL] },
  { id: 'personne-2', baseSlug: 'cut-afro-court', looks: [LOCKS, TRESSES, BUZZ] },
  { id: 'personne-3', baseSlug: 'cut-cheveux-longs', looks: [AFRO, BOUCLES, MIDDLE] },
  { id: 'personne-4', baseSlug: 'cut-middle-part', looks: [BOUCLES, LOCKS, BUZZ] },
] as const;

export interface HeroFrame {
  id: string;
  label: string;
  /** Photo, ou dessin de cette coupe faute de photo. */
  before: { src: string | null; slug: string };
  after: { src: string | null; slug: string };
}

/**
 * Images du hero.
 *
 * Ce sont les mêmes fichiers que la section exemples : une photo déposée une
 * fois sert aux deux endroits. Rien à dupliquer, rien à tenir à jour deux fois.
 *
 * Faute de photo, on retombe sur les dessins — chaque personne du hero devient
 * autant d'étapes qu'elle a de coupes.
 */
export function resolveHeroFrames(): readonly HeroFrame[] {
  const photos = resolveExamples();

  if (photos.length > 0) {
    return photos.map((pair) => ({
      id: pair.slug,
      label: pair.label,
      before: { src: pair.before, slug: pair.slug },
      after: { src: pair.after, slug: pair.slug },
    }));
  }

  return HERO_PEOPLE.flatMap((person) =>
    person.looks.map((look) => ({
      id: `${person.id}-${look.slug}`,
      label: look.label,
      before: { src: null, slug: person.baseSlug },
      after: { src: null, slug: look.slug },
    })),
  );
}
