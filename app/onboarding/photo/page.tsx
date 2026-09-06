import { requireAccount } from '@/lib/paywall';
import PhotoStudio from '@/components/generation/PhotoStudio';
import { loadCatalog } from '@/lib/catalog-server';
import { loadProfile, hasPaidAccess } from '@/lib/profile';

export const metadata = { title: 'Ta photo — Trycut' };

export const dynamic = 'force-dynamic';

export default async function OnboardingPhotoPage() {
  await requireAccount();

  const [catalog, session] = await Promise.all([loadCatalog(), loadProfile()]);
  const paye = session ? hasPaidAccess(session.profile) : false;

  return (
    <main>
      <PhotoStudio
        items={catalog}
        nextBasePath="/onboarding/generation"
        /* Le catalogue premium reste fermé tant que l'offre longue n'est pas prise. */
        lockedPremium
        creditsRemaining={null}
        authenticated={Boolean(session)}
        paywalled={!paye}
      />
    </main>
  );
}
