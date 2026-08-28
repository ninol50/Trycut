'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';

/** Libellés d'étape rotatifs, toutes les 2,5 s. */
const STEPS: readonly string[] = [
  'Analyse du visage…',
  'Détection de la ligne de cheveux…',
  'Application du style…',
  'Harmonisation de la lumière…',
];

const ROTATION_MS = 2500;
const CIRCUMFERENCE = 2 * Math.PI * 54;

/**
 * État « chargement » du pipeline.
 * Progression circulaire violette, libellés rotatifs, selfie source flouté en
 * fond. Jamais de spinner nu.
 */
export function GenerationProgress({
  sourcePreviewUrl,
  elapsedMs,
  timeoutMs,
}: {
  sourcePreviewUrl: string;
  elapsedMs: number;
  timeoutMs: number;
}) {
  const reduced = useReducedMotion() ?? false;
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setStepIndex((current) => (current + 1) % STEPS.length),
      ROTATION_MS,
    );
    return () => clearInterval(timer);
  }, []);

  // La progression est plafonnée à 92 % : elle ne prétend jamais être terminée
  // avant que le résultat soit réellement là.
  const ratio = Math.min(0.92, elapsedMs / timeoutMs);

  return (
    <div className="relative flex min-h-[70dvh] flex-col items-center justify-center overflow-hidden rounded-2xl">
      {sourcePreviewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sourcePreviewUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl"
        />
      )}

      <div className="relative flex flex-col items-center px-5 text-center">
        <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">
          <circle cx="64" cy="64" r="54" fill="none" stroke="var(--violet-50)" strokeWidth="8" />
          <motion.circle
            cx="64"
            cy="64"
            r="54"
            fill="none"
            stroke="var(--violet-600)"
            strokeWidth="8"
            strokeLinecap="round"
            transform="rotate(-90 64 64)"
            strokeDasharray={CIRCUMFERENCE}
            initial={false}
            animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - ratio) }}
            transition={{ duration: reduced ? 0.15 : 0.6, ease: 'easeOut' }}
          />
        </svg>

        <div className="mt-6 h-14">
          <AnimatePresence mode="wait">
            <motion.p
              key={stepIndex}
              initial={{ opacity: 0, y: reduced ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -8 }}
              transition={{ duration: 0.25 }}
              className="text-body-lg font-semibold text-violet-900"
            >
              {STEPS[stepIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <p className="mt-1 text-body-sm text-slate-500">
          Reste sur cette page, ça prend moins d’une minute.
        </p>
      </div>
    </div>
  );
}
