'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { revealVariants, useReducedMotion } from '@/lib/motion';

/** Entrée au scroll : `once: true`, 16 px de translation, jamais de scale. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion() ?? false;
  const variants = revealVariants(reduced);

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={variants}
      transition={{ delay: reduced ? 0 : delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
