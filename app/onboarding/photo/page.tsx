import PhotoStudio from '@/components/generation/PhotoStudio';
import { loadCatalog } from '@/lib/catalog-server';
import { isSupabaseConfigured } from '@/lib/env';
import { getSessionUser } from '@/lib/supabase/server';

export const metadata = { title: 'Ta photo — Trycut' };

export const dynamic = 'force-dynamic';

export default async function OnboardingPhotoPage() {
  const [catalog, user] = await Promise.all([
    loadCatalog(),
    isSupabaseConfigured ? getSessionUser() : Promise.resolve(null),
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
