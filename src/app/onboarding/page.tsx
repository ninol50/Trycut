import type { Metadata } from 'next';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { loadCatalog } from '@/lib/catalog-server';

/** Le catalogue bouge rarement : une revalidation horaire suffit. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Ton profil',
  robots: { index: false },
};

export default async function OnboardingPage() {
  // Le catalogue est chargé ici pour que le récapitulatif de l'écran 13 annonce
  // un nombre de coupes réellement dérivé des réponses.
  const catalog = await loadCatalog();

  return (
    <main className="min-h-dvh bg-white">
      <OnboardingFlow catalog={catalog} />
    </main>
  );
}
