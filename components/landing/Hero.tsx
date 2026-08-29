'use client';

import { motion } from 'framer-motion';
import CtaButton from '@/components/CtaButton';
import { useEntrance } from '@/components/motion';

/** Séquence orchestrée : titre, sous-titre +80ms, CTA +160ms. */
export default function Hero() {
  const title = useEntrance(0);
  const subtitle = useEntrance(0.08);
  const cta = useEntrance(0.16);

  return (
    <section className="section pb-10 pt-12">
      <motion.h1 {...title} className="text-3xl">
        Teste ta prochaine coupe
        <br />
        avant de la faire.
      </motion.h1>

      <motion.p {...subtitle} className="mt-4 text-lg text-slate-500">
        Importe un selfie, choisis un style, et vois le résultat sur ton visage.
      </motion.p>

      <motion.div {...cta} className="mt-7">
        <CtaButton location="hero" fullWidth>
          Tester ma nouvelle coupe
        </CtaButton>
        <p className="mt-3 text-center text-sm text-slate-500">
          Résultat en 30 secondes · Sans engagement
        </p>
      </motion.div>
    </section>
  );
}
