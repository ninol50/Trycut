/** Validation d'entrée (section 7.3). Le MIME est REvérifié côté serveur. */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MIN_DIMENSION = 512;
export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type UploadErrorCode = 'file' | 'too_small';

export const UPLOAD_MESSAGES: Record<UploadErrorCode, string> = {
  file: 'Format non supporté. Utilise un JPG ou un PNG de moins de 10 Mo.',
  too_small: 'Cette photo est trop petite. Il faut au moins 512 pixels de côté.',
};

export function isAcceptedMime(type: string): boolean {
  return (ACCEPTED_MIME as readonly string[]).includes(type);
}

export function extensionFor(type: string): 'jpg' | 'png' | 'webp' {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

/** Vérifie la signature binaire du fichier : le Content-Type déclaré ne suffit pas. */
export function sniffImageMime(bytes: Uint8Array): string | null {
  const b = (index: number): number => bytes[index] ?? -1;

  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'image/jpeg';
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return 'image/png';
  if (
    b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 &&
    b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}
