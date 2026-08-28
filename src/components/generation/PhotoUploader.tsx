'use client';

import { useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { motion } from 'framer-motion';
import { useTap } from '@/lib/motion';
import { capture } from '@/lib/analytics';
import {
  ACCEPTED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MIN_DIMENSION_PX,
  TARGET_LONG_EDGE_PX,
  isAcceptedMime,
} from '@/lib/image';

export interface UploadedPhoto {
  /** Chemin encodé `bucket:objet`, renvoyé par la route d'upload. */
  storagePath: string;
  /** Aperçu local — objectURL, jamais l'URL signée. */
  previewUrl: string;
}

interface PhotoUploaderProps {
  onUploaded: (photo: UploadedPhoto) => void;
  photo: UploadedPhoto | null;
  disabled?: boolean;
}

type Status = 'idle' | 'compressing' | 'uploading';

export function PhotoUploader({ onUploaded, photo, disabled = false }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const tap = useTap();
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File): Promise<void> {
    setError(null);

    if (!isAcceptedMime(file.type)) {
      setError('Format non supporté. Utilise un JPG ou un PNG de moins de 10 Mo.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Format non supporté. Utilise un JPG ou un PNG de moins de 10 Mo.');
      return;
    }

    const dimensions = await readDimensions(file);
    if (dimensions && Math.min(dimensions.width, dimensions.height) < MIN_DIMENSION_PX) {
      setError(`Photo trop petite. Il faut au moins ${MIN_DIMENSION_PX} px de côté.`);
      return;
    }

    try {
      setStatus('compressing');
      // Compression avant upload : 1600 px sur le côté long.
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: TARGET_LONG_EDGE_PX,
        maxSizeMB: 2,
        useWebWorker: true,
        fileType: file.type,
      });

      setStatus('uploading');
      const form = new FormData();
      form.append('file', compressed, file.name);

      const response = await fetch('/api/uploads', { method: 'POST', body: form });
      const payload: unknown = await response.json();

      if (!response.ok) {
        setError(readMessage(payload) ?? 'L’envoi a échoué. Réessaie.');
        return;
      }

      const storagePath = readStoragePath(payload);
      if (!storagePath) {
        setError('L’envoi a échoué. Réessaie.');
        return;
      }

      capture('photo_uploaded', { bytes: compressed.size, mime: file.type });
      onUploaded({ storagePath, previewUrl: URL.createObjectURL(compressed) });
    } catch {
      setError('La connexion a été interrompue. Réessaie.');
    } finally {
      setStatus('idle');
    }
  }

  const busy = status !== 'idle';

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME_TYPES.join(',')}
        capture="user"
        className="sr-only"
        // Hors du parcours clavier : l'input est visuellement masqué, il
        // constituerait un arrêt de tabulation invisible et sans indicateur
        // de focus. C'est le bouton ci-dessous, lui bien visible, qui
        // l'active — au clic comme au clavier.
        tabIndex={-1}
        disabled={disabled || busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handleFile(file);
        }}
      />

      <motion.button
        type="button"
        whileTap={disabled || busy ? undefined : tap}
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
        className="flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-2xl
                   border-2 border-dashed border-violet-200 bg-violet-50 px-5 py-8 text-center
                   disabled:opacity-60"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.previewUrl}
            alt="Ton selfie"
            width={200}
            height={250}
            className="h-[200px] w-auto rounded-2xl object-cover"
          />
        ) : (
          <>
            <span className="text-[2rem] leading-none text-violet-400" aria-hidden="true">
              ↑
            </span>
            <span className="text-body font-semibold text-violet-900">
              {busy ? 'Envoi en cours…' : 'Importer un selfie'}
            </span>
            <span className="text-body-sm text-slate-500">
              Visage de face, bien éclairé, sans casquette
            </span>
          </>
        )}
      </motion.button>

      {photo && !busy && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 min-h-tap text-body-sm font-semibold text-violet-600 underline"
        >
          Changer de photo
        </button>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-violet-50 px-4 py-3 text-body-sm text-violet-900">
          {error}
        </p>
      )}
    </div>
  );
}

async function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    // `createImageBitmap` peut échouer sur certains navigateurs : le serveur
    // reste l'autorité sur la validation.
    return null;
  }
}

function readStoragePath(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const value = (payload as { storagePath?: unknown }).storagePath;
  return typeof value === 'string' ? value : null;
}

function readMessage(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const value = (payload as { message?: unknown }).message;
  return typeof value === 'string' ? value : null;
}
