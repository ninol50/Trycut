'use client';

import { useEffect, useState } from 'react';
import type { Transition, Variants } from 'framer-motion';
import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

/**
 * Préférence de mouvement réduit, sûre à l'hydratation.
 *
 * `useReducedMotion` de Framer renvoie `null` au rendu serveur : le serveur ne
 * peut pas connaître la préférence de la machine du visiteur. S'en servir pour
 * décider du rendu INITIAL fait donc diverger le HTML serveur et le premier
 * rendu client — React signale un « tree hydrated but some attributes […]
 * didn't match » et abandonne la réconciliation de ce sous-arbre.
 *
 * On renvoie donc `false` tant que le composant n'est pas monté : le premier
 * rendu client est identique au rendu serveur, et la préférence s'applique à
 * partir de l'effet suivant — c'est-à-dire avant toute animation réelle.
 */
export function useReducedMotion(): boolean {
  const preference = useFramerReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return mounted && preference === true;
}

/**
 * Vocabulaire de mouvement de la marque (section 2).
 * Tout passe par ici : le motion est orchestré, jamais éparpillé au fil des
 * composants. Chaque helper renvoie une version « fade seul » quand
 * `prefers-reduced-motion` est actif.
 */

export const EASE_BRAND: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const SPRING_PROGRESS: Transition = {
  type: 'spring',
  stiffness: 220,
  damping: 30,
};

/** Séquence orchestrée du chargement de la landing : titre, sous-titre, CTA. */
export function heroVariants(reduced: boolean): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 24 },
    visible: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: reduced
        ? { duration: 0.2, delay: 0 }
        : { duration: 0.5, delay, ease: EASE_BRAND },
    }),
  };
}

/** Entrée au scroll : 16 px maximum, jamais de scale ni de rotation. */
export function revealVariants(reduced: boolean): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: reduced ? { duration: 0.2 } : { duration: 0.45, ease: EASE_BRAND },
    },
  };
}

/** Transitions horizontales de l'onboarding, via AnimatePresence mode="wait". */
export function stepVariants(reduced: boolean): Variants {
  if (reduced) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1, transition: { duration: 0.18 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }
  return {
    enter: (direction: number) => ({ opacity: 0, x: direction >= 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0, transition: { duration: 0.32, ease: EASE_BRAND } },
    exit: (direction: number) => ({
      opacity: 0,
      x: direction >= 0 ? -40 : 40,
      transition: { duration: 0.22, ease: EASE_BRAND },
    }),
  };
}

/** Cascade du récapitulatif (écran 13). */
export function cascadeVariants(reduced: boolean): Variants {
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 12 },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: reduced
        ? { duration: 0.15 }
        : { duration: 0.4, delay: index * 0.07, ease: EASE_BRAND },
    }),
  };
}

/** `whileTap` uniforme sur tous les boutons. */
export function useTap(): { scale: number } {
  const reduced = useReducedMotion();
  return { scale: reduced ? 1 : 0.97 };
}
