'use client';

import { motion } from 'framer-motion';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import { useInView } from '@/components/motion';

export interface ExamplePair {
  before: string | null;
  after: string | null;
  label: string;
}

interface ExamplesProps {
  pairs: readonly ExamplePair[];
}

/** Paire avant/après côte à côte, avec les pastilles de la référence. */
function SideBySide({ pair }: { pair: ExamplePair }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-line">
      <div className="grid grid-cols-2">
        {(['before', 'after'] as const).map((side) => {
          const src = pair[side];
          return (
            <div key={side} className="relative aspect-[3/4] bg-violet-50">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={side === 'before' ? 'Avant' : 'Après'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid h-full w-full place-items-center px-3 text-center text-[11px] text-violet-400">
                  {side === 'before' ? 'avant' : 'après'}
                </span>
              )}
              <span
                className={`badge-dark absolute bottom-3 rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                  side === 'before' ? 'left-3' : 'right-3'
                }`}
              >
                {side === 'before' ? 'Avant' : 'Après'}
              </span>
            </div>
          );
        })}
      </div>
      <p className="px-5 py-4 text-sm text-slate-500">
        Style appliqué : <span className="font-semibold text-violet-900">{pair.label}</span>
      </p>
    </div>
  );
}

export default function Examples({ pairs }: ExamplesProps) {
  const anim = useInView();
  const first = pairs[0];

  return (
    <motion.section {...anim} className="section py-14">
      <h2 className="text-3xl">Le rendu, avant le coup de ciseaux.</h2>
      <p className="mt-4 text-lg text-slate-500">
        Teste ton prochain look avant de passer chez le coiffeur.
      </p>

      {/* Le comparateur reste manipulable au doigt. */}
      {first ? (
        <div className="mt-8">
          <BeforeAfterSlider
            beforeSrc={first.before}
            afterSrc={first.after}
            label="Glisse pour comparer"
          />
        </div>
      ) : null}

      <div className="mt-8 space-y-4">
        {pairs.slice(1).map((pair) => (
          <SideBySide key={pair.label} pair={pair} />
        ))}
      </div>
    </motion.section>
  );
}
