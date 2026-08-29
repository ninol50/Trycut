import { requirePaidAccess } from '@/lib/paywall';
import PhotoStudio from '@/components/generation/PhotoStudio';
import { loadCatalog } from '@/lib/catalog-server';
import { getSessionUser } from '@/lib/supabase/server';

export const metadata = { title: 'Ta photo — Trycut' };

export const dynamic = 'force-dynamic';

export default async function OnboardingPhotoPage() {
  await requirePaidAccess();

  const [catalog, user] = await Promise.all([
    loadCatalog(),
    getSessionUser(),
  ]);

  return (
    <main>
      <PhotoStudio
        items={catalog}
        nextBasePath="/onboarding/generation"
        /* L'essai gratuit n'ouvre pas le catalogue premium. */
        lockedPremium
        creditsRemaining={null}
        authenticated={Boolean(user)}
      />
    </main>
  );
}
