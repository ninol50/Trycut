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

export const DEMO_VIDEO = {
  mp4: '/demo/demo-loop.mp4',
  webm: '/demo/demo-loop.webm',
  poster: '/demo/demo-poster.jpg',
} as const;

export interface DemoPair {
  before: string;
  after: string;
  label: string;
}

export const DEMO_PAIRS: readonly DemoPair[] = [
  { before: '/demo/before-1.jpg', after: '/demo/after-1.jpg', label: 'dégradé bas' },
  { before: '/demo/before-2.jpg', after: '/demo/after-2.jpg', label: 'platine' },
  { before: '/demo/before-3.jpg', after: '/demo/after-3.jpg', label: 'chaîne fine' },
] as const;

// ------------------------------------------------------------------ hero
/**
 * Coupes que le hero fait défiler tout seul.
 *
 * Tant qu'aucune photo n'est déposée, elles sont dessinées : mettre le visage
 * d'une personne réelle — connue ou non — sur une page marchande demande son
 * accord écrit, et un visage généré qui ressemble à quelqu'un pose le même
 * problème.
 *
 * Pour passer en photo : déposer `/public/hero/avant.jpg` (le visage de départ)
 * et un `/public/hero/{slug}.jpg` par coupe. Le basculement est automatique et
 * ne se fait que si le départ et au moins une coupe sont présents, pour ne
 * jamais mélanger une photo et un dessin dans la même carte.
 */
export interface HeroLookAsset {
  slug: string;
  label: string;
}

export const HERO_BASE_SLUG = 'cut-cheveux-longs';
export const HERO_BASE_SRC = '/hero/avant.jpg';

export const HERO_LOOKS: readonly HeroLookAsset[] = [
  { slug: 'cut-buzz', label: 'Buzz cut' },
  { slug: 'cut-degrade-espagnol', label: 'Dégradé espagnol' },
  { slug: 'cut-permanente-mi-longue', label: 'Cheveux bouclés mi-longs' },
  { slug: 'cut-middle-part', label: 'Middle part' },
  { slug: 'cut-tresses', label: 'Tresses' },
  { slug: 'cut-afro-court', label: 'Afro court' },
  { slug: 'cut-locks', label: 'Locks' },
  { slug: 'cut-chauve', label: 'Crâne rasé' },
] as const;

export interface ResolvedHero {
  baseSrc: string | null;
  baseSlug: string;
  looks: readonly (HeroLookAsset & { src: string | null })[];
}

/** Choisit photos ou dessins, sans jamais panacher les deux. */
export function resolveHero(): ResolvedHero {
  const withPhotos = HERO_LOOKS.filter((look) => hasPublicAsset(`/hero/${look.slug}.jpg`));
  const basePresent = hasPublicAsset(HERO_BASE_SRC);

  if (basePresent && withPhotos.length > 0) {
    return {
      baseSrc: HERO_BASE_SRC,
      baseSlug: HERO_BASE_SLUG,
      looks: withPhotos.map((look) => ({ ...look, src: `/hero/${look.slug}.jpg` })),
    };
  }

  return {
    baseSrc: null,
    baseSlug: HERO_BASE_SLUG,
    looks: HERO_LOOKS.map((look) => ({ ...look, src: null })),
  };
}
