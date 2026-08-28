import type { Metadata } from 'next';
import { GenerationRunner } from '@/components/generation/GenerationRunner';
import { getUser } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Génération en cours',
  robots: { index: false },
};

export default async function OnboardingGenerationPage() {
  // L'essai de l'onboarding a lieu sans compte : Realtime n'est activé que si
  // une session existe déjà, sinon le polling assure seul le suivi.
  const user = await getUser();

  return (
    <main className="min-h-dvh bg-white">
      <GenerationRunner
        authenticated={user !== null}
        photoHref="/onboarding/photo"
        resultHref="/onboarding/resultat"
      />
    </main>
  );
}
