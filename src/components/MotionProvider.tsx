'use client';

import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';

/**
 * Filet de sécurité global sur `prefers-reduced-motion`.
 *
 * Chaque composant gère déjà son propre repli en fade (voir `lib/motion.ts`),
 * mais certaines animations échappent à ce contrôle manuel — typiquement la
 * bordure partagée `layoutId` du catalogue, dont le ressort est piloté par
 * Framer lui-même. `reducedMotion="user"` neutralise toutes les animations de
 * transformation dès que le système le demande, y compris celles-là.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  // Activé seulement après montage : `reducedMotion="user"` modifie la façon
  // dont Framer rend les transformations, et le serveur ignore la préférence
  // du visiteur. L'activer dès le premier rendu recréerait exactement le
  // décalage d'hydratation que ce module cherche à éviter. Les animations
  // concernées (bordure partagée du catalogue) ne partent de toute façon
  // qu'après une interaction.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return <MotionConfig reducedMotion={mounted ? 'user' : 'never'}>{children}</MotionConfig>;
}
