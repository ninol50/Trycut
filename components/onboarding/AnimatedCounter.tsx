'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Compteur violet animé de l'écran de transition n°1. */
export default function AnimatedCounter({ to, suffix }: { to: number; suffix: string }) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? to : 0);

  useEffect(() => {
    if (reduced) {
      setValue(to);
      return;
    }
    const start = performance.now();
    const duration = 1200;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round((1 - Math.pow(1 - progress, 3)) * to));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, reduced]);

  return (
    <span className="font-display text-3xl text-violet-600">
      {value}
      {suffix}
    </span>
  );
}
