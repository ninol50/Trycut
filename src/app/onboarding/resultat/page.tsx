import type { Metadata } from 'next';
import { ResultView } from '@/components/generation/ResultView';
import { getUser } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Ton résultat',
  robots: { index: false },
};

export default async function OnboardingResultPage() {
  const user = await getUser();

  return (
    <main className="min-h-dvh bg-white">
      <ResultView photoHref="/onboarding/photo" signupPrompt={user === null} />
    </main>
  );
}
