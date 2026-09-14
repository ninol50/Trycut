'use client';

import { motion } from 'framer-motion';
import { useInView } from '@/components/motion';
import { TESTIMONIALS, VISUALISATIONS_CUMULEES } from '@/lib/testimonials';

/** Ne rend rien tant qu'aucun avis réel n'a été enregistré. */
export default function Testimonials() {
  const anim = useInView();
  if (TESTIMONIALS.length === 0) return null;

  return (
    <motion.section {...anim} className="section py-14">
      <h2 className="text-[32px]">
        Plus de {VISUALISATIONS_CUMULEES.toLocaleString('fr-FR')} personnes ont déjà
        visualisé leur prochaine coupe
      </h2>
      <p className="mt-4 text-lg text-slate-500">
        Teste ton prochain look avant de passer chez le coiffeur.
      </p>

      <div className="mt-8 space-y-4">
        {TESTIMONIALS.map((item) => (
          <article key={item.name} className="overflow-hidden rounded-3xl border border-line">
            <div className="grid grid-cols-2">
              {[
                { src: item.before, label: 'Avant' },
                { src: item.after, label: 'Après' },
              ].map((side) => (
                <div key={side.label} className="relative aspect-square bg-marine-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={side.src} alt={side.label} className="h-full w-full object-cover" />
                  <span
                    className={`badge-dark absolute bottom-3 rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                      side.label === 'Avant' ? 'left-3' : 'right-3'
                    }`}
                  >
                    {side.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-5">
              <p
                className="text-lg tracking-[0.15em] text-marine-900"
                aria-label={`${item.rating} sur 5`}
              >
                {'★'.repeat(item.rating)}
              </p>
              <p className="mt-3 text-base text-ink">« {item.quote} »</p>

              <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-marine-900 text-sm font-semibold text-white">
                  {item.name.slice(0, 1)}
                </span>
                <span className="font-semibold text-marine-900">{item.name}</span>
                {/* « Achat vérifié » n'est pas une décoration : il ne s'affiche
                    que sur les avis dont l'achat a été retrouvé. */}
                {item.verified ? (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="m8.5 12 2.5 2.5 4.5-4.5" />
                    </svg>
                    Achat vérifié
                  </span>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </motion.section>
  );
}
