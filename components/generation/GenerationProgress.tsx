'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const LABELS = [
  'Analyse du visage…',
  'Détection de la ligne de cheveux…',
  'Application du style…',
  'Harmonisation de la lumière…',
] as const;

/** État « chargement » : progression circulaire violette, libellés rotatifs,
 *  selfie source flouté en fond. Jamais de spinner nu. */
export default function GenerationProgress({ sourceUrl }: { sourceUrl: string | null }) {
  const reduced = useReducedMotion();
  const [labelIndex, setLabelIndex] = useState(0);
  const [progress, setProgress] = useState(0.04);

  useEffect(() => {
    const rotation = window.setInterval(() => {
      setLabelIndex((current) => (current + 1) % LABELS.length);
    }, 2500);
    return () => window.clearInterval(rotation);
  }, []);

  useEffect(() => {
    // Progression optimiste, plafonnée à 92 % jusqu'au vrai résultat.
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(0.92, current + (0.92 - current) * 0.08));
    }, 400);
    return () => window.clearInterval(timer);
  }, []);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative flex min-h-[70dvh] flex-col items-center justify-center overflow-hidden px-5">
      {sourceUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sourceUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl"
        />
      ) : null}

      <div className="relative">
        <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
          <circle cx="66" cy="66" r={radius} fill="none" stroke="var(--violet-50)" strokeWidth="8" />
          <motion.circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke="var(--violet-600)"
            strokeWidth="8"
            strokeLinecap="round"
            transform="rotate(-90 66 66)"
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: circumference * (1 - progress) }}
            transition={{ duration: reduced ? 0.1 : 0.5, ease: 'easeOut' }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-display text-xl text-violet-900">
          {Math.round(progress * 100)}%
        </span>
      </div>

      <div className="relative mt-8 h-6 text-center" role="status" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.p
            key={labelIndex}
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -8 }}
            transition={{ duration: 0.25 }}
            className="text-base text-violet-900"
          >
            {LABELS[labelIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="relative mt-2 text-sm text-slate-500">
        Tu peux rester ici, ça prend une trentaine de secondes.
      </p>
    </div>
  );
}
