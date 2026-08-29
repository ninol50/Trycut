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

  // Seul un compte banni est arrêté ici. L'inscription ouvre le site ; c'est
  // le solde de coupes, donc le paiement, qui ouvre la génération.
  if (session.profile.access_status === 'rejected') {
    return (
      <div className="section py-14">
        <h1 className="text-2xl">Accès refusé.</h1>
        <p className="mt-4 text-base text-slate-500">
          Ce compte n’a pas accès au service. Si tu penses que c’est une erreur, écris-nous.
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
