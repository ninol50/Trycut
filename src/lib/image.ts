/** Contraintes d'entrée — section 7.3. Partagées client et serveur. */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MIN_DIMENSION_PX = 512;
export const TARGET_LONG_EDGE_PX = 1600;

export const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AcceptedMime = (typeof ACCEPTED_MIME_TYPES)[number];

export function isAcceptedMime(value: string): value is AcceptedMime {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(value);
}

export function extensionFor(mime: AcceptedMime): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
      return 'jpg';
  }
}

/**
 * Détection du type réel à partir des octets d'en-tête.
 *
 * Le `Content-Type` d'un multipart est déclaré par le client : s'y fier
 * reviendrait à ne vérifier que l'extension. On lit la signature du fichier.
 */
export function sniffMime(bytes: Uint8Array): AcceptedMime | null {
  if (bytes.length < 12) return null;

  // JPEG : FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';

  // PNG : 89 50 4E 47 0D 0A 1A 0A
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, index) => bytes[index] === byte)) return 'image/png';

  // WebP : "RIFF" .... "WEBP"
  const riff = [0x52, 0x49, 0x46, 0x46];
  const webp = [0x57, 0x45, 0x42, 0x50];
  if (
    riff.every((byte, index) => bytes[index] === byte) &&
    webp.every((byte, index) => bytes[index + 8] === byte)
  ) {
    return 'image/webp';
  }

  return null;
}
