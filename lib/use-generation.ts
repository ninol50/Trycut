'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { publicEnv } from '@/lib/public-env';
import type { GenerationStatus } from '@/types/db';

export interface GenerationSnapshot {
  status: GenerationStatus | 'unknown';
  resultUrl: string | null;
  sourceUrl: string | null;
  watermarked: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  timedOut: boolean;
}

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 120_000;

const EMPTY: GenerationSnapshot = {
  status: 'unknown',
  resultUrl: null,
  sourceUrl: null,
  watermarked: false,
  errorCode: null,
  errorMessage: null,
  timedOut: false,
};

/**
 * Supabase Realtime en primaire, polling 2s en repli, timeout à 120s.
 * Le polling tourne dans tous les cas : c'est lui qui rapporte les URL signées.
 */
export function useGeneration(generationId: string | null): GenerationSnapshot {
  const [snapshot, setSnapshot] = useState<GenerationSnapshot>(EMPTY);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (!generationId) return;

    let cancelled = false;
    startedAt.current = Date.now();

    const fetchOnce = async () => {
      try {
        const response = await fetch(`/api/generations/${generationId}`, { cache: 'no-store' });
        if (!response.ok || cancelled) return;

        const data: unknown = await response.json();
        if (typeof data !== 'object' || data === null) return;

        const row = data as Partial<GenerationSnapshot> & { status?: GenerationStatus };
        setSnapshot((current) => ({
          ...current,
          status: row.status ?? current.status,
          resultUrl: row.resultUrl ?? current.resultUrl,
          sourceUrl: row.sourceUrl ?? current.sourceUrl,
          watermarked: row.watermarked ?? current.watermarked,
          errorCode: row.errorCode ?? null,
          errorMessage: row.errorMessage ?? null,
        }));
      } catch {
        // Coupure réseau : le prochain tick réessaie, le timeout tranchera.
      }
    };

    void fetchOnce();

    const interval = window.setInterval(() => {
      if (cancelled) return;

      if (Date.now() - startedAt.current > TIMEOUT_MS) {
        setSnapshot((current) =>
          current.status === 'succeeded' || current.status === 'failed'
            ? current
            : { ...current, timedOut: true },
        );
        window.clearInterval(interval);
        return;
      }
      void fetchOnce();
    }, POLL_INTERVAL_MS);

    // Realtime : accélère la sortie d'état, sans jamais être la seule source.
    let unsubscribe: (() => void) | null = null;
    if (publicEnv.supabaseUrl && publicEnv.supabaseAnonKey) {
      try {
        const supabase = createClient();
        const channel = supabase
          .channel(`generation-${generationId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'generations',
              filter: `id=eq.${generationId}`,
            },
            () => void fetchOnce(),
          )
          .subscribe();
        unsubscribe = () => void supabase.removeChannel(channel);
      } catch {
        // Realtime indisponible : le polling suffit.
      }
    }

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      unsubscribe?.();
    };
  }, [generationId]);

  return snapshot;
}
