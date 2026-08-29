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

  // Un compte en attente ne peut rien générer : on le dit au lieu de le laisser
  // buter sur un refus après avoir choisi une coupe.
  if (session.profile.access_status !== 'approved') {
    const rejected = session.profile.access_status === 'rejected';
    return (
      <div className="section py-14">
        <h1 className="text-2xl">
          {rejected ? 'Accès refusé.' : 'Ton compte est en attente.'}
        </h1>
        <p className="mt-4 text-base text-slate-500">
          {rejected
            ? 'Ce compte n’a pas accès au service. Si tu penses que c’est une erreur, écris-nous.'
            : 'Chaque inscription est validée à la main. Tu recevras un email dès que ton accès est ouvert.'}
        </p>
      </div>
    );
  }

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
