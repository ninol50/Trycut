import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Steps from '@/components/landing/Steps';
import Examples from '@/components/landing/Examples';
import Testimonials from '@/components/landing/Testimonials';
import Faq from '@/components/landing/Faq';
import FinalCta from '@/components/landing/FinalCta';
import Footer from '@/components/Footer';
import { resolveExamples, resolveHeroFrames } from '@/lib/demo-assets';
import { countCutsToday } from '@/lib/stats';
import { loadProfile } from '@/lib/profile';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  // Présence des visuels vérifiée côté serveur : jamais d'image cassée.
  const pairs = resolveExamples();
  const heroFrames = resolveHeroFrames();
  const cutsToday = await countCutsToday();

  // Où mène chaque bouton de la vitrine. Sans compte, tout ramène à
  // l'inscription ; avec un compte, au studio — abonnement ou non, puisque la
  // photo et la coupe se choisissent avant de payer. Personne n'atterrit sur
  // une grille de tarifs sans avoir vu ce qu'elle achète. Une route sous forme
  // de chaîne, jamais de fonction qui traverserait vers le client.
  const session = await loadProfile();
  const ctaHref = session ? '/app' : '/inscription';

  return (
    <>
      <Header ctaHref={ctaHref} />
      <main>
        <Hero heroFrames={heroFrames} cutsToday={cutsToday} ctaHref={ctaHref} />
        <Steps ctaHref={ctaHref} />
        <Examples pairs={pairs} />
        <Testimonials />
        {/* Pas de grille de tarifs sur l'accueil : un visiteur qui découvre le
            prix avant d'avoir vu ce que fait le produit s'en va. Le prix reste
            à un clic — lien « Tarifs » du pied de page, réponse de la FAQ, et
            page tarifs atteinte avant le moindre paiement. */}
        <Faq />
        <FinalCta ctaHref={ctaHref} />
      </main>
      <Footer />
    </>
  );
}
