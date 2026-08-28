import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import DemoVideo from '@/components/DemoVideo';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import Proof from '@/components/landing/Proof';
import HowItWorks from '@/components/landing/HowItWorks';
import CatalogTeaser from '@/components/landing/CatalogTeaser';
import PricingSummary from '@/components/landing/PricingSummary';
import Faq from '@/components/landing/Faq';
import FinalCta from '@/components/landing/FinalCta';
import Footer from '@/components/Footer';
import CtaButton from '@/components/CtaButton';
import { DEMO_PAIRS, hasPublicAsset } from '@/lib/demo-assets';
import { loadCatalog } from '@/lib/catalog-server';

export default async function LandingPage() {
  const catalog = await loadCatalog();

  // Présence des visuels vérifiée côté serveur : placeholder plutôt qu'image cassée.
  const pairs = DEMO_PAIRS.map((pair) => ({
    label: pair.label,
    before: hasPublicAsset(pair.before) ? pair.before : null,
    after: hasPublicAsset(pair.after) ? pair.after : null,
  }));
  const firstPair = pairs[0] ?? { before: null, after: null, label: 'dégradé bas' };

  return (
    <>
      <Header />
      <main>
        <Hero />

        <section className="px-5 pb-4">
          <DemoVideo />
          <div className="mx-auto mt-6 max-w-[320px]">
            <BeforeAfterSlider
              beforeSrc={firstPair.before}
              afterSrc={firstPair.after}
              label="Glisse pour comparer"
            />
          </div>
        </section>

        <Proof pairs={pairs} />

        <div className="section pb-2">
          <CtaButton location="after_proof" fullWidth>
            Tester ma nouvelle coupe
          </CtaButton>
        </div>

        <HowItWorks />
        <CatalogTeaser
          labels={catalog.slice(0, 9).map((item) => item.label)}
          totalCount={catalog.length}
        />
        <PricingSummary />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
