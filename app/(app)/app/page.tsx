import { redirect } from 'next/navigation';
import PhotoStudio from '@/components/generation/PhotoStudio';
import HistoryStrip from '@/components/generation/HistoryStrip';
import OnboardingSync from '@/components/onboarding/OnboardingSync';
import { loadCatalog } from '@/lib/catalog-server';
import { loadHistory, loadProfile, premiumLocked, hasPaidAccess } from '@/lib/profile';
import PaywallNotice from '@/components/PaywallNotice';

export const metadata = { title: 'Mon espace — Trycut' };
export const dynamic = 'force-dynamic';

export default async function AppPage() {
  const session = await loadProfile();
  if (!session) redirect('/connexion');

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

  if (!hasPaidAccess(session.profile)) {
    // Un paiement refusé doit être dit : le compte a payé, quelque chose s'est
    // cassé, et seul cet écran explique quoi faire.
    if (session.profile.subscription_status === 'past_due') {
      return <PaywallNotice reason="past_due" />;
    }

    // Personne n'arrive plus ici sur un « il te faut un abonnement ». On repart
    // au studio : la photo, les styles et le catalogue sont ouverts, et le
    // cadenas du bouton de rendu présente les offres le moment venu.
    redirect('/onboarding/photo');
  }

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
        paid
      />
      <HistoryStrip items={history} />
    </>
  );
}
