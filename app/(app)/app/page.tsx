import { redirect } from 'next/navigation';
import PhotoStudio from '@/components/generation/PhotoStudio';
import HistoryStrip from '@/components/generation/HistoryStrip';
import OnboardingSync from '@/components/onboarding/OnboardingSync';
import { loadCatalog } from '@/lib/catalog-server';
import { loadHistory, loadProfile, premiumLocked, hasPaidAccess } from '@/lib/profile';
import PaywallNotice from '@/components/PaywallNotice';

export const metadata = { title: 'Mon espace — Trycut' };
export const dynamic = 'force-dynamic';

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string }>;
}) {
  const params = await searchParams;
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

  // Paiement refusé : ce n'est pas une question de découverte du produit, la
  // personne l'a déjà acheté. On le dit franchement au lieu de la renvoyer
  // choisir une offre qu'elle a déjà prise.
  if (session.profile.subscription_status === 'past_due') {
    return <PaywallNotice reason="past_due" />;
  }

  const paye = hasPaidAccess(session.profile);

  // Le studio s'ouvre sans abonnement : on importe sa photo, on choisit sa
  // coupe, et c'est le bouton « générer » qui mène aux offres. Rien ne part au
  // serveur avant paiement — ni fichier, ni crédit. Une personne qui a vu sa
  // coupe choisie achète ; une personne arrêtée à la porte s'en va.
  const [catalog, history] = await Promise.all([
    loadCatalog(),
    paye ? loadHistory(session.user.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <OnboardingSync />

      {/* Retour de paiement. Le webhook crédite le compte de son côté : il
          arrive qu'il ait quelques secondes de retard sur le navigateur, et
          voir « il te faut un abonnement » juste après avoir payé fait
          paniquer. On le dit avant que la question se pose. */}
      {params.paiement === 'ok' ? (
        <div className="section pt-6">
          <p role="status" className="rounded-2xl border border-line p-4 text-sm text-slate-500">
            {paye
              ? 'Paiement reçu. Ta photo et ta coupe t’attendent : lance le rendu.'
              : 'Paiement reçu. L’accès s’ouvre dans quelques secondes — recharge la page si le bouton renvoie encore aux offres.'}
          </p>
        </div>
      ) : null}

      <PhotoStudio
        items={catalog}
        nextBasePath="/app/generation"
        lockedPremium={premiumLocked(session.profile)}
        creditsRemaining={session.profile.credits_remaining}
        authenticated
        paywalled={!paye}
      />
      <HistoryStrip items={history} />
    </>
  );
}
