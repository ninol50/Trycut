'use client';

import { motion } from 'framer-motion';
import { SPRING_PROGRESS, useReducedMotion } from '@/lib/motion';

/**
 * Barre de progression persistante.
 * Le total est toujours affiché : le masquer augmente l'abandon.
 */
export function ProgressBar({ step, total }: { step: number; total: number }) {
  const reduced = useReducedMotion() ?? false;
  const ratio = Math.min(1, Math.max(0, step / total));

  return (
    <div className="w-full">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-violet-50"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
        aria-label={`Étape ${step} sur ${total}`}
      >
        <motion.div
          className="h-full rounded-full bg-violet-600"
          initial={false}
          animate={{ width: `${ratio * 100}%` }}
          transition={reduced ? { duration: 0.15 } : SPRING_PROGRESS}
        />
      </div>
      <p className="mt-2 text-body-sm text-slate-500">
        Étape {step} sur {total}
      </p>
    </div>
  );
}
