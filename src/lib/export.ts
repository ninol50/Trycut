'use client';

/**
 * Export 9:16 (section 11, étape 7).
 *
 * Le format vertical est celui des stories et de TikTok : c'est le format dans
 * lequel le résultat va circuler. Le filigrane est conditionnel et son état
 * vient du serveur (`generations.watermarked`, figé au moment de la
 * génération d'après le plan), jamais d'un calcul côté client.
 *
 * Le plan gratuit reçoit en plus une définition réduite : c'est ce qui
 * distingue concrètement l'essai offert d'un export payant.
 */

const HD = { width: 1080, height: 1920 };
const LOW = { width: 720, height: 1280 };

export interface ExportOptions {
  watermarked: boolean;
  label?: string;
}

export async function buildExport(
  imageUrl: string,
  options: ExportOptions,
): Promise<Blob | null> {
  const image = await loadImage(imageUrl);
  if (!image) return null;

  const size = options.watermarked ? LOW : HD;
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, size.width, size.height);

  drawCover(context, image, size.width, size.height);

  if (options.label) {
    drawLabel(context, options.label, size);
  }

  if (options.watermarked) {
    drawWatermark(context, size);
  }

  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function drawLabel(
  context: CanvasRenderingContext2D,
  label: string,
  size: { width: number; height: number },
): void {
  const fontSize = Math.round(size.width * 0.036);
  const paddingX = Math.round(size.width * 0.035);
  const paddingY = Math.round(size.width * 0.022);

  context.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  const metrics = context.measureText(label);
  const boxWidth = metrics.width + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;
  const x = Math.round(size.width * 0.045);
  const y = Math.round(size.height * 0.045);

  context.fillStyle = 'rgba(255, 255, 255, 0.92)';
  roundedRect(context, x, y, boxWidth, boxHeight, boxHeight / 2);
  context.fill();

  context.fillStyle = '#2E1065';
  context.textBaseline = 'middle';
  context.fillText(label, x + paddingX, y + boxHeight / 2);
}

/** Filigrane discret, coin bas droit, opacité 0,5. */
function drawWatermark(
  context: CanvasRenderingContext2D,
  size: { width: number; height: number },
): void {
  const text = 'trycut.app';
  const fontSize = Math.round(size.width * 0.032);

  context.save();
  context.globalAlpha = 0.5;
  context.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  context.textAlign = 'right';
  context.textBaseline = 'alphabetic';

  // Léger halo sombre pour rester lisible sur un fond clair comme sur un fond
  // foncé, sans jamais devenir tapageur.
  context.shadowColor = 'rgba(0, 0, 0, 0.35)';
  context.shadowBlur = Math.round(fontSize * 0.4);
  context.fillStyle = '#FFFFFF';
  context.fillText(
    text,
    size.width - Math.round(size.width * 0.05),
    size.height - Math.round(size.height * 0.035),
  );
  context.restore();
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    // Le résultat est relayé par notre propre domaine : pas de canvas
    // « tainted », donc `toBlob` reste utilisable.
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export type ShareOutcome = 'shared' | 'downloaded' | 'failed';

/**
 * `navigator.share()` avec repli téléchargement.
 * Le partage natif est le chemin qui compte sur mobile ; le téléchargement
 * couvre desktop et les navigateurs sans Web Share.
 */
export async function shareOrDownload(blob: Blob, filename: string): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: 'Mon nouveau look' });
      return 'shared';
    } catch (error) {
      // L'utilisateur a annulé : ce n'est pas un échec à signaler.
      if (error instanceof DOMException && error.name === 'AbortError') return 'failed';
    }
  }

  return download(blob, filename) ? 'downloaded' : 'failed';
}

export function download(blob: Blob, filename: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}
