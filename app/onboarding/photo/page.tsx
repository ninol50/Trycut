import PhotoStudio from '@/components/generation/PhotoStudio';
import { loadCatalog } from '@/lib/catalog-server';

export const metadata = { title: 'Ta photo — Trycut' };

export default async function OnboardingPhotoPage() {
  const catalog = await loadCatalog();

  return (
    <main>
      <PhotoStudio
        items={catalog}
        nextBasePath="/onboarding/generation"
        /* L'essai gratuit n'ouvre pas le catalogue premium. */
        lockedPremium
        creditsRemaining={null}
      />
    </main>
  );
}
