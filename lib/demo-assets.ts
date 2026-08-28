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
