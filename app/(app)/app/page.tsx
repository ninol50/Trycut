import { redirect } from 'next/navigation';
import PhotoStudio from '@/components/generation/PhotoStudio';
import HistoryStrip from '@/components/generation/HistoryStrip';
import OnboardingSync from '@/components/onboarding/OnboardingSync';
import { loadCatalog } from '@/lib/catalog-server';
import { loadHistory, loadProfile, premiumLocked, hasPaidAccess } from '@/lib/profile';
import { syncAccessFromWhop } from '@/lib/whop-sync';
import PaywallNotice from '@/components/PaywallNotice';

export const metadata = { title: 'Mon espace — Trycut' };
export const dynamic = 'force-dynamic';

export default async function AppPage() {
  const premier = await loadProfile();
  if (!premier) redirect('/connexion');

  // L'état de l'abonnement vient de Whop, pas d'un message reçu autrefois.
  await syncAccessFromWhop(premier.profile);
  const session = (await loadProfile()) ?? premier;

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

  // Sans abonnement actif, on ne charge même pas le catalogue : il n'y a rien
  // à montrer avant le paiement.
  if (!hasPaidAccess(session.profile)) {
    return (
      <PaywallNotice reason={session.profile.subscription_status === 'past_due' ? 'past_due' : 'none'} />
    );
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
      />
      <HistoryStrip items={history} />
    </>
  );
}
