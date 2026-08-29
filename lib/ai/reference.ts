import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { env } from '@/lib/env';

/**
 * Photos de référence, une par style.
 *
 * Une image montre au modèle ce qu'est vraiment une coupe, là où une phrase ne
 * fait que la décrire. Le fichier vit dans `public/reference/{slug}.jpg` : il
 * doit être joignable par le fournisseur, donc servi publiquement — pas d'URL
 * signée ici, contrairement à la photo de la personne, qui reste privée.
 *
 * Absente, le rendu se fait à la description seule : rien ne casse, le style
 * est simplement moins fidèle.
 */
export function referenceUrlFor(slug: string): string | null {
  // Le slug vient de la base, jamais du client, mais un chemin se vérifie.
  if (!/^[a-z0-9-]+$/.test(slug)) return null;

  const relative = `reference/${slug}.jpg`;
  try {
    if (!existsSync(join(process.cwd(), 'public', relative))) return null;
  } catch {
    return null;
  }

  return `${env.siteUrl}/${relative}`;
}

/** Consigne ajoutée quand au moins une référence accompagne la demande. */
export const REFERENCE_CLAUSE =
  'The first image is the person to edit, and the only person who may appear in ' +
  'the result: the output must be that same person, same face, same head angle, ' +
  'same background. The other images are style references only. Reproduce the ' +
  'shape of the haircut, beard or colour they show, adapted to the head angle, ' +
  'hair colour and hair texture of the person in the first image — if that person ' +
  'faces the camera, the same cut must be rendered facing the camera. Never copy ' +
  'the reference person’s face, skin tone, body, clothing, pose or background, and ' +
  'never return the reference image itself.';
