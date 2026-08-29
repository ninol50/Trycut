'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useInView } from '@/components/motion';
import { track } from '@/lib/analytics';

const STEPS = [
  { label: 'Importe un selfie', icon: 'upload' },
  { label: 'Choisis une coupe', icon: 'scissors' },
  { label: 'L’IA se met au travail', icon: 'sparkles' },
  { label: 'Découvre le résultat', icon: 'check' },
] as const;

const PATHS: Record<(typeof STEPS)[number]['icon'], string> = {
  upload: 'M12 16V8m0 0-3 3m3-3 3 3M4 16.5A4 4 0 0 1 6 9a6 6 0 0 1 11.5-1.5A3.5 3.5 0 0 1 20 16.5',
  scissors: 'M6 6l12 12M18 6 9.5 14.5M8 8a2.5 2.5 0 1 1-3.5-3.5A2.5 2.5 0 0 1 8 8Zm-3.5 8a2.5 2.5 0 1 0 3.5 3.5A2.5 2.5 0 0 0 4.5 16Z',
  sparkles: 'm12 4 1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Zm6 8 .8 2.2L21 15l-2.2.8L18 18l-.8-2.2L15 15l2.2-.8L18 12Z',
  check: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Zm-3.5-9 2.5 2.5 5-5',
};

export default function Steps() {
  const anim = useInView();

  return (
    <motion.section {...anim} className="section py-14">
      <h2 className="text-3xl">Ta prochaine coupe en 4 étapes</h2>

      <ol className="mt-8 overflow-hidden rounded-3xl border border-line">
        {STEPS.map((step, index) => (
          <li
            key={step.label}
            className="flex items-center gap-4 border-b border-line px-5 py-5 last:border-b-0"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--violet-600)"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
              aria-hidden="true"
            >
              <path d={PATHS[step.icon]} />
            </svg>
            <span className="text-base text-slate-500">
              Étape {index + 1}.{' '}
              <span className="font-semibold text-violet-900">{step.label}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        <Link
          href="/onboarding/photo"
          onClick={() => track('landing_cta_clicked', { location: 'steps' })}
          className="btn-primary w-full"
        >
          Trouver ma coupe
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </motion.section>
  );
}
