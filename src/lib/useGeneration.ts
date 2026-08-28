'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { GenerationStatus } from '@/lib/types/db';

export const GENERATION_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 2000;

export interface GenerationState {
  status: GenerationStatus | 'idle';
  resultUrl: string | null;
  watermarked: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  elapsedMs: number;
}

interface StatusPayload {
  status?: unknown;
  resultUrl?: unknown;
  watermarked?: unknown;
  errorCode?: unknown;
  errorMessage?: unknown;
}

function isTerminal(status: GenerationStatus | 'idle'): boolean {
  return status === 'succeeded' || status === 'failed';
}

/**
 * Suivi d'une génération.
 *
 * Canal principal : Supabase Realtime sur la ligne `generations` (réservé aux
 * utilisateurs connectés — le RLS n'expose rien à un visiteur anonyme).
 * Repli systématique : polling `GET /api/generations/:id` toutes les 2 s, avec
 * un timeout à 120 s. Le repli tourne dans tous les cas : Realtime accélère,
 * il n'est jamais la seule voie.
 */
export function useGeneration(generationId: string | null, realtime: boolean): GenerationState {
  const [state, setState] = useState<GenerationState>({
    status: 'idle',
    resultUrl: null,
    watermarked: true,
    errorCode: null,
    errorMessage: null,
    elapsedMs: 0,
  });

  const startedAt = useRef<number>(Date.now());
  const settled = useRef(false);

  const applyPayload = useCallback((payload: StatusPayload) => {
    setState((current) => {
      const status =
        typeof payload.status === 'string' ? (payload.status as GenerationStatus) : current.status;
      return {
        ...current,
        status,
        resultUrl: typeof payload.resultUrl === 'string' ? payload.resultUrl : current.resultUrl,
        watermarked:
          typeof payload.watermarked === 'boolean' ? payload.watermarked : current.watermarked,
        errorCode: typeof payload.errorCode === 'string' ? payload.errorCode : current.errorCode,
        errorMessage:
          typeof payload.errorMessage === 'string' ? payload.errorMessage : current.errorMessage,
      };
    });
    if (typeof payload.status === 'string' && isTerminal(payload.status as GenerationStatus)) {
      settled.current = true;
    }
  }, []);

  // Horloge d'affichage : alimente la progression circulaire.
  useEffect(() => {
    if (!generationId) return;
    startedAt.current = Date.now();
    settled.current = false;

    const timer = setInterval(() => {
      setState((current) => ({ ...current, elapsedMs: Date.now() - startedAt.current }));
    }, 200);

    return () => clearInterval(timer);
  }, [generationId]);

  // Polling — le chemin fiable.
  useEffect(() => {
    if (!generationId) return;
    let cancelled = false;

    const poll = async (): Promise<void> => {
      if (cancelled || settled.current) return;

      if (Date.now() - startedAt.current > GENERATION_TIMEOUT_MS) {
        settled.current = true;
        setState((current) => ({
          ...current,
          status: 'failed',
          errorCode: 'timeout',
        }));
        return;
      }

      try {
        const response = await fetch(`/api/generations/${generationId}`, { cache: 'no-store' });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (typeof payload === 'object' && payload !== null && !cancelled) {
          applyPayload(payload as StatusPayload);
        }
      } catch {
        // Coupure réseau ponctuelle : le tick suivant réessaie. On ne bascule
        // en erreur qu'au timeout.
      }
    };

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [generationId, applyPayload]);

  // Realtime — l'accélérateur.
  useEffect(() => {
    if (!generationId || !realtime) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`generation:${generationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generations',
          filter: `id=eq.${generationId}`,
        },
        (message) => {
          const row = message.new as { status?: unknown; error_code?: unknown };
          if (typeof row.status !== 'string') return;
          // On ne lit pas `result_path` ici : l'URL signée vient de la route
          // serveur, qui vérifie d'abord la propriété de la ligne.
          if (row.status === 'succeeded' || row.status === 'failed') {
            void fetch(`/api/generations/${generationId}`, { cache: 'no-store' })
              .then((response) => (response.ok ? response.json() : null))
              .then((payload: unknown) => {
                if (typeof payload === 'object' && payload !== null) {
                  applyPayload(payload as StatusPayload);
                }
              })
              .catch(() => undefined);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [generationId, realtime, applyPayload]);

  return state;
}
