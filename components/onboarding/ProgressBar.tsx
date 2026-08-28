'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
}

/** Barre violette persistante. Le total est toujours affiché. */
export default function ProgressBar({ current, total }: ProgressBarProps) {
  const reduced = useReducedMotion();
  const ratio = total > 0 ? Math.min(1, current / total) : 0;

  return (
    <div className="section pt-4">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-50">
        <motion.div
          className="h-full rounded-full bg-violet-600"
          initial={false}
          animate={{ width: `${ratio * 100}%` }}
          transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 180, damping: 24 }}
        />
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Étape {current} sur {total}
      </p>
    </div>
  );
}
