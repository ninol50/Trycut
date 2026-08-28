'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GenerationProgress } from '@/components/generation/GenerationProgress';
import { Button, LinkButton } from '@/components/ui/Button';
import { GENERATION_TIMEOUT_MS, useGeneration } from '@/lib/useGeneration';
import { uiErrorFor } from '@/lib/errors';
import { capture } from '@/lib/analytics';
import { clearPending, readPending } from '@/lib/pending';
import type { PendingGeneration } from '@/lib/pending';
import { ONBOARDING_STORAGE_KEY, parseAnswers } from '@/lib/onboarding';
import { RESULT_STORAGE_KEY } from '@/lib/result';

interface GenerationRunnerProps {
  /** Realtime n'est disponible qu'aux utilisateurs connectés (RLS). */
  authenticated: boolean;
  /** Où retourner pour choisir une autre photo ou un autre style. */
  photoHref: string;
  resultHref: string;
}

type Phase = 'starting' | 'running' | 'error';

export function GenerationRunner({
  authenticated,
  photoHref,
  resultHref,
}: GenerationRunnerProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingGeneration | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('starting');
  const [error, setError] = useState<{ title: string; href?: string; label?: string } | null>(null);
  const started = useRef(false);

  const state = useGeneration(generationId, authenticated);

  const start = useCallback(async (job: PendingGeneration) => {
    const answers = parseAnswers(window.localStorage.getItem(ONBOARDING_STORAGE_KEY));

    try {
      const response = await fetch('/api/generations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          imagePath: job.storagePath,
          catalogItemId: job.catalogItemId,
          answers: {
            texture: answers.texture,
            faceShape: answers.faceShape,
            beard: answers.beard,
            length: answers.length,
          },
        }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = readString(payload, 'message') ?? uiErrorFor(readString(payload, 'code')).title;
        const action = uiErrorFor(readString(payload, 'code')).action;
        setError({ title: message, href: action?.href, label: action?.label });
        setPhase('error');
        return;
      }

      const id = readString(payload, 'generationId');
      if (!id) {
        setError({ title: uiErrorFor('provider').title });
        setPhase('error');
        return;
      }

      setGenerationId(id);
      setPhase('running');
    } catch {
      setError({ title: 'La connexion a été interrompue. Réessaie.' });
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const job = readPending();
    if (!job) {
      router.replace(photoHref);
      return;
    }
    setPending(job);
    void start(job);
  }, [router, photoHref, start]);

  // Succès : on passe la main à l'écran de résultat.
  useEffect(() => {
    if (state.status !== 'succeeded' || !state.resultUrl || !pending) return;

    capture('first_generation_succeeded', { catalog_item: pending.catalogItemId });
    window.sessionStorage.setItem(
      RESULT_STORAGE_KEY,
      JSON.stringify({
        generationId,
        resultUrl: state.resultUrl,
        beforeUrl: pending.previewUrl,
        label: pending.catalogLabel,
        watermarked: state.watermarked,
      }),
    );
    clearPending();
    router.replace(resultHref);
  }, [state.status, state.resultUrl, state.watermarked, pending, generationId, router, resultHref]);

  // Échec côté pipeline.
  useEffect(() => {
    if (state.status !== 'failed') return;
    const ui = uiErrorFor(state.errorCode);
    setError({
      title: state.errorMessage ?? ui.title,
      href: ui.action?.href,
      label: ui.action?.label,
    });
    setPhase('error');
  }, [state.status, state.errorCode, state.errorMessage]);

  if (phase === 'error' && error) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
        <h1 className="text-display-lg">Ça n’a pas marché</h1>
        <p className="mt-3 text-body text-slate-500">{error.title}</p>

        <div className="mt-8 space-y-3">
          {error.href && error.label && (
            <LinkButton href={error.href} fullWidth>
              {error.label}
            </LinkButton>
          )}
          <Button
            variant={error.href ? 'secondary' : 'primary'}
            fullWidth
            onClick={() => router.replace(photoHref)}
          >
            Reprendre une photo
          </Button>
        </div>

        <Link
          href="/"
          className="mt-6 text-center text-body-sm font-semibold text-violet-600 underline"
        >
          Revenir à l’accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 py-6">
      <GenerationProgress
        sourcePreviewUrl={pending?.previewUrl ?? ''}
        elapsedMs={state.elapsedMs}
        timeoutMs={GENERATION_TIMEOUT_MS}
      />
      {pending?.catalogLabel && (
        <p className="mt-4 text-center text-body-sm text-slate-500">
          Style demandé : {pending.catalogLabel}
        </p>
      )}
    </div>
  );
}

function readString(payload: unknown, key: string): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}
