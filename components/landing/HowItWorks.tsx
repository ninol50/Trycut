'use client';

import { motion } from 'framer-motion';
import { useInView } from '@/components/motion';

const STEPS = [
  { title: 'Importe un selfie', detail: 'De face, bien éclairé, sans casquette.' },
  { title: 'Choisis un style', detail: 'Coupe, couleur ou accessoire dans le catalogue.' },
  { title: 'Regarde le résultat', detail: 'Comparateur avant/après, exportable en 9:16.' },
] as const;

export default function HowItWorks() {
  const anim = useInView();

  return (
    <motion.section {...anim} className="section py-10">
      <h2 className="text-xl">Comment ça marche</h2>
      <ol className="mt-5 space-y-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex items-start gap-4 rounded-2xl bg-violet-50 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-600 text-sm font-semibold text-white">
              {index + 1}
            </span>
            <span>
              <span className="block font-semibold text-violet-900">{step.title}</span>
              <span className="block text-sm text-slate-500">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </motion.section>
  );
}
