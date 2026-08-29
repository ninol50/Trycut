import { redirect } from 'next/navigation';
import PhotoStudio from '@/components/generation/PhotoStudio';
import HistoryStrip from '@/components/generation/HistoryStrip';
import OnboardingSync from '@/components/onboarding/OnboardingSync';
import { loadCatalog } from '@/lib/catalog-server';
import { loadHistory, loadProfile, premiumLocked } from '@/lib/profile';

export const metadata = { title: 'Mon espace — Trycut' };
export const dynamic = 'force-dynamic';

export default async function AppPage() {
  const session = await loadProfile();
  if (!session) redirect('/connexion');

  const [catalog, history] = await Promise.all([
    loadCatalog(),
    loadHistory(session.user.id),
  ]);

  return (
    <>
      <OnboardingSync />
      <PhotoStudio
        items={catalog}
        nextBasePath="/app/generation"
        lockedPremium={premiumLocked(session.profile)}
        creditsRemaining={session.profile.credits_remaining}
        authenticated
      />
      <HistoryStrip items={history} />
    </>
  );
}
