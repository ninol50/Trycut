import type { Metadata } from 'next';
import { getSessionContext } from '@/lib/supabase/server';
import { ResultView } from '@/components/generation/ResultView';

export const metadata: Metadata = { title: 'Ton résultat', robots: { index: false } };

export default async function AppResultPage() {
  const session = await getSessionContext();

  return (
    <ResultView
      photoHref="/app"
      signupPrompt={false}
      firstNameFallback={session?.profile.first_name ?? undefined}
    />
  );
}
