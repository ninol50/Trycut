'use client';

import { useReducedMotion } from 'framer-motion';

export const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Variantes d'entrée. Avec `prefers-reduced-motion`, tout tombe
 * à un simple fade d'opacité (règle obligatoire, section 2).
 */
export function useEntrance(delay = 0) {
  const reduced = useReducedMotion();

  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.2, delay: 0 },
    };
  }

  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: EASE },
  };
}

export function useInView(delay = 0) {
  const reduced = useReducedMotion();

  if (reduced) {
    return {
      initial: { opacity: 0 },
      whileInView: { opacity: 1 },
      viewport: { once: true, margin: '-40px' },
      transition: { duration: 0.25, delay: 0 },
    };
  }

  return {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-40px' },
    transition: { duration: 0.45, delay, ease: EASE },
  };
}

export function useTapScale() {
  const reduced = useReducedMotion();
  return reduced ? undefined : { scale: 0.97 };
}
