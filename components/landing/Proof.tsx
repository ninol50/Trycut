'use client';

import { motion } from 'framer-motion';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import { useInView } from '@/components/motion';

interface ProofProps {
  pairs: readonly { before: string | null; after: string | null; label: string }[];
}

/** 3 transformations avant/après en cartes horizontales scrollables. */
export default function Proof({ pairs }: ProofProps) {
  const anim = useInView();

  return (
    <motion.section {...anim} className="py-10">
      <div className="section">
        <h2 className="text-xl">Trois transformations, trois secondes chacune.</h2>
      </div>

      <div className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2">
        {pairs.map((pair) => (
          <div key={pair.label} className="w-[240px] shrink-0 snap-center">
            <BeforeAfterSlider
              beforeSrc={pair.before}
              afterSrc={pair.after}
              label={pair.label}
            />
          </div>
        ))}
      </div>
    </motion.section>
  );
}
