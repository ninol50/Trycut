import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Steps from '@/components/landing/Steps';
import Testimonials from '@/components/landing/Testimonials';
import Faq from '@/components/landing/Faq';
import FinalCta from '@/components/landing/FinalCta';
import Footer from '@/components/Footer';
import ActivityToasts from '@/components/landing/ActivityToasts';
import { resolveHeroFrames } from '@/lib/demo-assets';
import { countCutsToday } from '@/lib/stats';
import { loadRecentCuts } from '@/lib/recent-activity';
import { loadProfile, hasPaidAccess } from '@/lib/profile';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  // Présence des visuels vérifiée côté serveur : jamais d'image cassée.
  const heroFrames = resolveHeroFrames();
  const [cutsToday, recentCuts] = await Promise.all([countCutsToday(), loadRecentCuts()]);

  // Où mène chaque bouton de la vitrine. Sans compte, il mène au studio :
  // choisir sa photo et parcourir les styles ne coûte rien, et c'est en voyant
  // le produit qu'on a envie de le payer. Le verrou est sur le rendu, pas sur
  // la porte d'entrée. Une route sous forme de chaîne, jamais de fonction qui
  // traverserait vers le client.
  const session = await loadProfile();
  const ctaHref = !session
    ? '/onboarding/photo'
    : hasPaidAccess(session.profile)
      ? '/app'
      : '/onboarding/photo';

  return (
    <>
      <Header ctaHref={ctaHref} />
      <main>
        <Hero heroFrames={heroFrames} cutsToday={cutsToday} ctaHref={ctaHref} />
        <Steps ctaHref={ctaHref} />
        {/* Une seule preuve, et elle vient des clients : la galerie d'exemples
            montrait les mêmes avant/après une deuxième fois, juste au-dessus
            des avis qui les portent mieux. */}
        <Testimonials />
        {/* Pas de grille de tarifs sur l'accueil : un visiteur qui découvre le
            prix avant d'avoir vu ce que fait le produit s'en va. Le prix reste
            à un clic — lien « Tarifs » du pied de page, réponse de la FAQ, et
            page tarifs atteinte avant le moindre paiement. */}
        <Faq />
        <FinalCta ctaHref={ctaHref} />
      </main>
      <Footer />
      {/* Activité réelle, ou rien du tout. */}
      <ActivityToasts cuts={recentCuts} />
    </>
  );
}
