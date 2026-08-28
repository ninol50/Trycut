'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Reveal } from '@/components/landing/Reveal';
import { useTap } from '@/lib/motion';
import { capture } from '@/lib/analytics';

const MotionLink = motion.create(Link);

/**
 * Bloc CTA final — avec les cartes de catalogue sélectionnées, c'est la seule
 * exception au fond blanc dominant.
 */
export function LandingCta() {
  const tap = useTap();

  return (
    <section className="px-5 py-12">
      <Reveal>
        <div className="rounded-2xl bg-violet-900 px-6 py-10 text-center">
          <h2 className="text-display-lg text-white">
            La coupe ratée coûte trois mois. L’essai en coûte trente secondes.
          </h2>
          <p className="mt-4 text-body text-violet-200">
            Premier essai offert, sans compte et sans carte bancaire.
          </p>
          <MotionLink
            href="/onboarding"
            whileTap={tap}
            onClick={() => capture('landing_cta_clicked', { position: 'footer' })}
            className="mt-7 inline-flex min-h-tap w-full items-center justify-center rounded-full
                       bg-white px-6 text-body font-semibold text-violet-900"
          >
            Tester ma nouvelle coupe
          </MotionLink>
        </div>
      </Reveal>
    </section>
  );
}
