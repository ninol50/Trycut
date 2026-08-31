'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { PRICING } from '@/lib/pricing';
import { useInView } from '@/components/motion';

export default function PricingSummary({ ctaHref }: { ctaHref: string }) {
  const anim = useInView();

  return (
    <motion.section {...anim} className="section py-10">
      <h2 className="text-xl">Tarifs</h2>

      <div className="mt-5 space-y-3">
        {PRICING.map((plan) => (
          <div
            key={plan.id}
            className={`card relative ${plan.highlighted ? 'border-2 border-violet-600' : ''}`}
          >
            {plan.highlighted ? (
              <span className="absolute -top-3 left-5 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
                Le plus choisi
              </span>
            ) : null}

            <div className="flex items-baseline justify-between">
              <span className="font-display text-lg font-bold text-violet-900">{plan.name}</span>
              <span className="font-display text-xl text-violet-900">
                {plan.strikePrice ? (
                  <span className="mr-2 text-sm font-normal text-slate-500 line-through">
                    {plan.strikePrice}
                  </span>
                ) : null}
                {plan.price}
                <span className="text-sm font-normal text-slate-500">{plan.period}</span>
              </span>
            </div>

            <p className="mt-2 text-sm font-semibold text-violet-600">
              {plan.credits === 0 ? 'Aucune coupe incluse' : `${plan.credits} coupes ${plan.creditsPeriod}`}
            </p>

            <ul className="mt-3 space-y-1 text-sm text-slate-500">
              {plan.features.map((feature) => (
                <li key={feature}>· {feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        Les coupes ne sont pas reportables d’une période à l’autre.
      </p>

      <Link
        href={ctaHref}
        className="mt-4 flex min-h-[48px] items-center justify-center text-center text-sm font-semibold text-violet-600 underline"
      >
        Voir le détail des offres
      </Link>
    </motion.section>
  );
}
