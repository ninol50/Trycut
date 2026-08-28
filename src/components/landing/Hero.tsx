'use client';

import { motion } from 'framer-motion';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { LinkButton } from '@/components/ui/Button';
import { heroVariants, useReducedMotion } from '@/lib/motion';
import { capture } from '@/lib/analytics';

/**
 * Séquence orchestrée au chargement : titre, sous-titre à +80 ms, CTA à +160 ms.
 * Une seule action possible sur cet écran.
 */
export function Hero() {
  const reduced = useReducedMotion() ?? false;
  const variants = heroVariants(reduced);

  return (
    <section className="mx-auto w-full max-w-md px-5 pb-14 pt-10">
      <motion.p
        custom={0}
        initial="hidden"
        animate="visible"
        variants={variants}
        className="mb-4 inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1
                   text-body-sm font-semibold text-violet-600"
      >
        Essai virtuel de coupe
      </motion.p>

      <motion.h1
        custom={0}
        initial="hidden"
        animate="visible"
        variants={variants}
        className="text-display-xl"
      >
        Teste ta prochaine coupe avant de t’asseoir dans le fauteuil.
      </motion.h1>

      <motion.p
        custom={0.08}
        initial="hidden"
        animate="visible"
        variants={variants}
        className="mt-4 text-body-lg text-slate-500"
      >
        Une photo, un style, trente secondes. Tu vois le résultat sur ton propre
        visage avant de prendre rendez-vous.
      </motion.p>

      <motion.div
        custom={0.16}
        initial="hidden"
        animate="visible"
        variants={variants}
        className="mt-7"
      >
        <LinkButton
          href="/onboarding"
          fullWidth
          onClick={() => capture('landing_cta_clicked', { position: 'hero' })}
        >
          Tester ma nouvelle coupe
        </LinkButton>
        <p className="mt-3 text-center text-body-sm text-slate-500">
          Premier essai offert. Sans compte, sans carte bancaire.
        </p>
      </motion.div>

      <motion.div
        custom={0.24}
        initial="hidden"
        animate="visible"
        variants={variants}
        className="mt-10"
      >
        <BeforeAfterSlider
          beforeSrc="/demo/before-1.jpg"
          afterSrc="/demo/after-1.jpg"
          beforeAlt="Photo avant transformation"
          afterAlt="Photo après transformation"
        />
        <p className="mt-3 text-center text-body-sm text-slate-500">
          Fais glisser la poignée pour comparer.
        </p>
      </motion.div>
    </section>
  );
}
