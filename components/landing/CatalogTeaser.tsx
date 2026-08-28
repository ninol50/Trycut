'use client';

import { motion } from 'framer-motion';
import CtaButton from '@/components/CtaButton';
import { useInView } from '@/components/motion';

interface CatalogTeaserProps {
  /** Vignettes du catalogue, floutées. Le total réel est affiché en overlay. */
  labels: readonly string[];
  totalCount: number;
}

export default function CatalogTeaser({ labels, totalCount }: CatalogTeaserProps) {
  const anim = useInView();
  const visible = labels.slice(0, 9);
  const remaining = Math.max(totalCount - visible.length, 0);

  return (
    <motion.section {...anim} className="section py-10">
      <h2 className="text-xl">Un catalogue calibré sur ce qui se porte ici.</h2>

      <div className="relative mt-5">
        <div className="grid grid-cols-3 gap-2" aria-hidden="true">
          {visible.map((label) => (
            <div
              key={label}
              className="grid aspect-square place-items-center rounded-2xl bg-violet-50 px-1 text-center text-[10px] leading-tight text-violet-400 blur-[2px]"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-violet">
            +{remaining} styles
          </span>
        </div>
      </div>

      <div className="mt-6">
        <CtaButton location="catalog_teaser" variant="secondary" fullWidth>
          Voir le catalogue
        </CtaButton>
      </div>
    </motion.section>
  );
}
