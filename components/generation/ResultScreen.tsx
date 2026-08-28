'use client';

import { useRouter } from 'next/navigation';
import ResultView from '@/components/generation/ResultView';
import GenerationProgress from '@/components/generation/GenerationProgress';
import ErrorState from '@/components/generation/ErrorState';
import { useGeneration } from '@/lib/use-generation';

interface ResultScreenProps {
  generationId: string | null;
  retryPath: string;
  signupPrompt?: boolean;
}

export default function ResultScreen({
  generationId,
  retryPath,
  signupPrompt = false,
}: ResultScreenProps) {
  const router = useRouter();
  const snapshot = useGeneration(generationId);

  if (!generationId) {
    return <ErrorState kind="network" onRetry={() => router.push(retryPath)} />;
  }

  if (snapshot.status === 'failed' || snapshot.timedOut) {
    return (
      <ErrorState
        kind="network"
        message={snapshot.errorMessage ?? undefined}
        onRetry={() => router.push(retryPath)}
      />
    );
  }

  if (snapshot.status !== 'succeeded') {
    return <GenerationProgress sourceUrl={snapshot.sourceUrl} />;
  }

  return (
    <ResultView
      sourceUrl={snapshot.sourceUrl}
      resultUrl={snapshot.resultUrl}
      watermarked={snapshot.watermarked}
      signupPrompt={signupPrompt}
      onRetry={() => router.push(retryPath)}
    />
  );
}
