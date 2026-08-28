'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';

/** Écran de transition n°1 : compteur violet animé. */
export function AnimatedCounter({ to, suffix }: { to: number; suffix: string }) {
  const reduced = useReducedMotion() ?? false;
  const [value, setValue] = useState(reduced ? to : 0);

  useEffect(() => {
    if (reduced) {
      setValue(to);
      return;
    }
    let frame = 0;
    const duration = 900;
    const start = performance.now();

    const tick = (now: number): void => {
      const raw = Math.min((now - start) / duration, 1);
      setValue(Math.round(to * (1 - Math.pow(1 - raw, 3))));
      if (raw < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, reduced]);

  return (
    <p className="text-[4rem] font-bold leading-none tracking-[-0.03em] text-violet-600">
      {value}
      <span className="text-display-lg text-violet-400">{suffix}</span>
    </p>
  );
}

/** Écran de transition n°2 : squelette animé pendant 2 s. */
export function SkeletonPreview({ onDone, durationMs }: { onDone: () => void; durationMs: number }) {
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    const timer = setTimeout(onDone, durationMs);
    return () => clearTimeout(timer);
  }, [onDone, durationMs]);

  return (
    <div className="grid grid-cols-2 gap-3" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <motion.div
          key={index}
          className="h-28 rounded-2xl border border-violet-200 bg-violet-50"
          animate={reduced ? { opacity: 1 } : { opacity: [0.45, 1, 0.45] }}
          transition={
            reduced
              ? { duration: 0.2 }
              : { duration: 1.2, repeat: Infinity, delay: index * 0.12, ease: 'easeInOut' }
          }
        />
      ))}
    </div>
  );
}
