import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Steps from '@/components/landing/Steps';
import Examples from '@/components/landing/Examples';
import Testimonials from '@/components/landing/Testimonials';
import PricingSummary from '@/components/landing/PricingSummary';
import Faq from '@/components/landing/Faq';
import FinalCta from '@/components/landing/FinalCta';
import Footer from '@/components/Footer';
import { resolveExamples, resolveHero } from '@/lib/demo-assets';
import { countCutsToday } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  // Présence des visuels vérifiée côté serveur : jamais d'image cassée.
  const pairs = resolveExamples();
  const hero = resolveHero();
  const cutsToday = await countCutsToday();

  return (
    <>
      <Header />
      <main>
        <Hero heroPeople={hero} cutsToday={cutsToday} />
        <Steps />
        <Examples pairs={pairs} />
        <Testimonials />
        <PricingSummary />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
