'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GenerationProgress from '@/components/generation/GenerationProgress';
import ErrorState, { type ErrorKind } from '@/components/generation/ErrorState';
import { useGeneration } from '@/lib/use-generation';
import { track } from '@/lib/analytics';

interface GenerationWatcherProps {
  generationId: string | null;
  successBasePath: string;
  retryPath: string;
}

/** Écran d'attente : bascule automatiquement vers le résultat ou l'erreur. */
export default function GenerationWatcher({
  generationId,
  successBasePath,
  retryPath,
}: GenerationWatcherProps) {
  const router = useRouter();
  const snapshot = useGeneration(generationId);

  useEffect(() => {
    if (snapshot.status === 'succeeded' && generationId) {
      track('first_generation_succeeded', { generationId });
      router.replace(`${successBasePath}?id=${generationId}`);
    }
  }, [snapshot.status, generationId, router, successBasePath]);

  if (!generationId) {
    return <ErrorState kind="network" onRetry={() => router.push(retryPath)} />;
  }

  if (snapshot.timedOut) {
    return (
      <ErrorState
        kind="network"
        message="Le rendu prend plus de temps que prévu. Ta coupe n’est pas perdue, réessaie."
        onRetry={() => router.push(retryPath)}
      />
    );
  }

  if (snapshot.status === 'failed') {
    const kind: ErrorKind = snapshot.errorCode === 'no_face' ? 'no_face' : 'network';
    return (
      <ErrorState
        kind={kind}
        message={snapshot.errorMessage ?? undefined}
        onRetry={() => router.push(retryPath)}
      />
    );
  }

  return <GenerationProgress sourceUrl={snapshot.sourceUrl} />;
}
