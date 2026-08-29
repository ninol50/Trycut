'use client';

import { motion } from 'framer-motion';
import { useInView } from '@/components/motion';
import { TESTIMONIALS } from '@/lib/testimonials';

/** Ne rend rien tant qu'aucun avis réel n'a été enregistré. */
export default function Testimonials() {
  const anim = useInView();
  if (TESTIMONIALS.length === 0) return null;

  return (
    <motion.section {...anim} className="section py-14">
      <h2 className="text-3xl">Ils ont sauté le pas</h2>

      <div className="mt-8 space-y-4">
        {TESTIMONIALS.map((item) => (
          <article key={item.name} className="overflow-hidden rounded-3xl border border-line">
            <div className="grid grid-cols-2">
              {[
                { src: item.before, label: 'Avant' },
                { src: item.after, label: 'Après' },
              ].map((side) => (
                <div key={side.label} className="relative aspect-[3/4] bg-violet-50">
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
              <p className="text-lg tracking-[0.15em] text-violet-600" aria-label={`${item.rating} sur 5`}>
                {'★'.repeat(item.rating)}
              </p>
              <p className="mt-3 text-base text-ink">« {item.quote} »</p>

              <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-600 text-sm font-semibold text-white">
                  {item.name.slice(0, 1)}
                </span>
                <span className="font-semibold text-violet-900">{item.name}</span>
                {item.verified ? (
                  <span className="text-sm text-slate-500">· Achat vérifié</span>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </motion.section>
  );
}
