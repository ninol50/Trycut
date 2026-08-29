'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Placeholder from '@/components/Placeholder';

interface ScanCardProps {
  src: string | null;
  /** Libellé de la pastille en bas de carte. */
  badge?: string;
}

/**
 * Carte photo du hero : coins en équerre violets, ligne de scan qui balaie
 * le visage, pastille d'état. Avec `prefers-reduced-motion`, la ligne
 * s'immobilise au centre.
 */
export default function ScanCard({ src, badge = 'Transformation en cours' }: ScanCardProps) {
  const reduced = useReducedMotion();

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-3xl border border-violet-200 bg-violet-50"
      style={{ width: '100%', maxWidth: 320, aspectRatio: '3 / 4' }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" aria-hidden="true" className="h-full w-full object-cover" />
      ) : (
        <Placeholder
          width={320}
          height={427}
          label="Photo de démo — voir /public/demo/README.md"
          className="!border-0 !bg-transparent"
        />
      )}

      {/* Équerres aux quatre coins */}
      {(
        [
          'left-4 top-4 border-l-2 border-t-2 rounded-tl-lg',
          'right-4 top-4 border-r-2 border-t-2 rounded-tr-lg',
          'left-4 bottom-4 border-b-2 border-l-2 rounded-bl-lg',
          'right-4 bottom-4 border-b-2 border-r-2 rounded-br-lg',
        ] as const
      ).map((corner) => (
        <span
          key={corner}
          aria-hidden="true"
          className={`pointer-events-none absolute h-7 w-7 border-violet-400 ${corner}`}
        />
      ))}

      {/* Ligne de scan */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, transparent, var(--violet-400), var(--violet-600), var(--violet-400), transparent)',
        }}
        initial={{ top: '50%' }}
        animate={reduced ? { top: '50%' } : { top: ['28%', '72%', '28%'] }}
        transition={reduced ? undefined : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <span className="badge-dark absolute inset-x-0 bottom-4 mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-medium">
        <span className="h-2 w-2 rounded-full bg-violet-400" aria-hidden="true" />
        {badge}
      </span>
    </div>
  );
}
