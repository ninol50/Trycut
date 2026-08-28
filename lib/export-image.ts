'use client';

/**
 * Export 9:16 (1080×1920), filigrane conditionnel.
 * Le filigrane du plan gratuit : coin bas droit, opacité 0,5.
 */

const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1920;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image illisible'));
    image.src = src;
  });
}

export async function buildExportBlob(
  resultUrl: string,
  watermark: boolean,
): Promise<Blob | null> {
  try {
    const image = await loadImage(resultUrl);
    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_WIDTH;
    canvas.height = EXPORT_HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#12101A';
    ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

    // Recadrage centré en cover.
    const scale = Math.max(EXPORT_WIDTH / image.width, EXPORT_HEIGHT / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    ctx.drawImage(
      image,
      (EXPORT_WIDTH - drawWidth) / 2,
      (EXPORT_HEIGHT - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );

    // Mention permanente sous chaque résultat.
    ctx.font = '500 28px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.textAlign = 'left';
    ctx.fillText('Image générée par IA', 48, EXPORT_HEIGHT - 48);

    if (watermark) {
      ctx.globalAlpha = 0.5;
      ctx.font = '700 40px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'right';
      ctx.fillText('trycut', EXPORT_WIDTH - 48, EXPORT_HEIGHT - 110);
      ctx.globalAlpha = 1;
    }

    return await new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92),
    );
  } catch {
    // Canvas teinté ou image inaccessible : l'appelant retombe sur le lien direct.
    return null;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function shareOrDownload(
  blob: Blob,
  filename: string,
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: 'Ma nouvelle coupe' });
      return 'shared';
    } catch {
      // Partage annulé ou refusé : on retombe sur le téléchargement.
    }
  }

  downloadBlob(blob, filename);
  return 'downloaded';
}
