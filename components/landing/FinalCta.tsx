'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useInView } from '@/components/motion';
import { track } from '@/lib/analytics';

const REASSURANCE = [
  'Paiement sécurisé par Whop',
  'Résiliable à tout moment',
  'Résultat en 30 secondes',
] as const;

export default function FinalCta({ ctaHref }: { ctaHref: string }) {
  const anim = useInView();

  return (
    <motion.section {...anim} className="section py-14">
      <div className="rounded-3xl border border-line px-6 py-10 text-center">
        <h2 className="text-3xl">Prêt à découvrir ton prochain look ?</h2>
        <p className="mt-4 text-lg text-slate-500">
          Importe ta photo et visualise une nouvelle coupe en quelques instants.
        </p>

        <div className="mt-7">
          <Link
            href={ctaHref}
            onClick={() => track('landing_cta_clicked', { location: 'final' })}
            className="btn-primary w-full"
          >
            Trouver ma coupe
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        <ul className="mt-6 space-y-2 text-sm text-slate-500">
          {REASSURANCE.map((item) => (
            <li key={item} className="flex items-center justify-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 13 4 4L19 7" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
