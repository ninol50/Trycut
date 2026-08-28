import type { Metadata } from 'next';
import { PhotoStep } from '@/components/generation/PhotoStep';
import { loadCatalog } from '@/lib/catalog-server';

/** Le catalogue bouge rarement : une revalidation horaire suffit. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Ta photo',
  robots: { index: false },
};

export default async function OnboardingPhotoPage() {
  const catalog = await loadCatalog();

  return (
    <main className="min-h-dvh bg-white">
      <PhotoStep catalog={catalog} nextHref="/onboarding/generation" />
    </main>
  );
}
