'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import HeroTransform, { type HeroPerson } from '@/components/landing/HeroTransform';
import { useEntrance } from '@/components/motion';
import { track } from '@/lib/analytics';

interface HeroProps {
  /** Personnes que le hero enchaîne. Sans photo, une seule silhouette dessinée. */
  heroPeople: readonly HeroPerson[];
  /**
   * Nombre réel de coupes générées aujourd'hui. La pastille de preuve sociale
   * ne s'affiche qu'à partir d'un volume crédible — on n'invente pas de chiffre.
   */
  cutsToday: number | null;
}

export default function Hero({ heroPeople, cutsToday }: HeroProps) {
  const pill = useEntrance(0);
  const title = useEntrance(0.06);
  const subtitle = useEntrance(0.14);
  const cta = useEntrance(0.22);
  const visual = useEntrance(0.3);

  return (
    <section className="dotted">
      <div className="section pb-12 pt-8">
        {cutsToday !== null && cutsToday >= 50 ? (
          <motion.p
            {...pill}
            className="mx-auto mb-7 flex w-fit items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm text-violet-900"
          >
            <span className="h-2 w-2 rounded-full bg-violet-600" aria-hidden="true" />
            {cutsToday.toLocaleString('fr-FR')} coupes visualisées aujourd’hui
          </motion.p>
        ) : null}

        <motion.h1 {...title} className="text-[38px] leading-[1.04] tracking-[-0.035em]">
          Trouve enfin la coupe qui te va.
        </motion.h1>

        <motion.p {...subtitle} className="mt-5 text-lg text-slate-500">
          Teste plusieurs styles sur ta propre photo et compare-les avant de choisir.
        </motion.p>

        <motion.div {...cta} className="mt-7">
          <Link
            href="/tarifs"
            onClick={() => track('landing_cta_clicked', { location: 'hero' })}
            className="btn-primary w-full"
          >
            Trouver ma coupe
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <p className="mt-4 text-center text-sm text-slate-500">
            15 coupes par mois · Résiliable à tout moment
          </p>
        </motion.div>

        <motion.div {...visual} className="mt-10">
          <HeroTransform people={heroPeople} />
        </motion.div>
      </div>
    </section>
  );
}
