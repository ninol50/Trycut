'use client';

import imageCompression from 'browser-image-compression';
import {
  MAX_UPLOAD_BYTES,
  MIN_DIMENSION,
  isAcceptedMime,
  type UploadErrorCode,
} from '@/lib/upload';

export type PreparedUpload =
  | { ok: true; file: File; previewUrl: string }
  | { ok: false; code: UploadErrorCode };

function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('lecture impossible'));
    };
    image.src = url;
  });
}

/** Compression avant upload : cible 1600px de côté long. */
export async function prepareUpload(file: File): Promise<PreparedUpload> {
  if (!isAcceptedMime(file.type) || file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, code: 'file' };
  }

  let dimensions: { width: number; height: number };
  try {
    dimensions = await readDimensions(file);
  } catch {
    return { ok: false, code: 'file' };
  }

  if (Math.min(dimensions.width, dimensions.height) < MIN_DIMENSION) {
    return { ok: false, code: 'too_small' };
  }

  try {
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: 1600,
      maxSizeMB: 2,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.86,
    });
    const named = new File([compressed], 'selfie.jpg', { type: 'image/jpeg' });
    return { ok: true, file: named, previewUrl: URL.createObjectURL(named) };
  } catch {
    // La compression est un confort, pas un prérequis.
    return { ok: true, file, previewUrl: URL.createObjectURL(file) };
  }
}
