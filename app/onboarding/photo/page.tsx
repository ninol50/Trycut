import PhotoStudio from '@/components/generation/PhotoStudio';
import { loadCatalog } from '@/lib/catalog-server';
import { loadProfile, hasPaidAccess, premiumLocked } from '@/lib/profile';

export const metadata = { title: 'Ta photo — Trycut' };

export const dynamic = 'force-dynamic';

/**
 * Studio ouvert à tout le monde, y compris sans compte.
 *
 * Choisir sa photo et parcourir les styles ne coûte rien et ne stocke rien :
 * sans abonnement, la photo ne quitte pas le téléphone. C'est le rendu — la
 * seule étape facturée — qui se verrouille, avec les offres à portée de main.
 * Montrer le produit avant de demander de payer est ce qui donne envie de payer.
 */
export default async function OnboardingPhotoPage() {
  const [catalog, session] = await Promise.all([loadCatalog(), loadProfile()]);
  const paid = session ? hasPaidAccess(session.profile) : false;

  return (
    <main>
      <PhotoStudio
        items={catalog}
        nextBasePath="/onboarding/generation"
        /* Le catalogue premium reste réservé aux offres qui l'incluent. */
        lockedPremium={session ? premiumLocked(session.profile) : true}
        creditsRemaining={session && paid ? session.profile.credits_remaining : null}
        authenticated={Boolean(session)}
        paid={paid}
      />
    </main>
  );
}
