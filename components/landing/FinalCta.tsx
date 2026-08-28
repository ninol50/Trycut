'use client';

import { motion } from 'framer-motion';
import CtaButton from '@/components/CtaButton';
import { useInView } from '@/components/motion';

/** Le seul bloc à fond violet plein de la page. */
export default function FinalCta() {
  const anim = useInView();

  return (
    <motion.section {...anim} className="px-5 py-10">
      <div className="mx-auto max-w-[480px] rounded-2xl bg-violet-600 px-6 py-10 text-center">
        <h2 className="text-xl text-white">Trente secondes maintenant, trois mois d’économisés.</h2>
        <p className="mt-3 text-base text-white/80">
          Ton premier essai est offert, sans compte.
        </p>
        <div className="mt-6">
          <CtaButton location="final" variant="inverse" fullWidth>
            Tester ma nouvelle coupe
          </CtaButton>
        </div>
      </div>
    </motion.section>
  );
}
