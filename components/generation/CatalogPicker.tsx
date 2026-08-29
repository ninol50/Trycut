'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORY_LABELS } from '@/lib/catalog';
import { useTapScale } from '@/components/motion';
import type { PublicCatalogItem } from '@/types/db';

interface CatalogPickerProps {
  items: readonly PublicCatalogItem[];
  selectedId: string | null;
  onSelect: (item: PublicCatalogItem) => void;
  lockedPremium: boolean;
}

/**
 * Le seul endroit à densité visuelle élevée.
 * Sélection = bordure violette animée via `layoutId` (micro-interaction signature).
 */
export default function CatalogPicker({
  items,
  selectedId,
  onSelect,
  lockedPremium,
}: CatalogPickerProps) {
  const tap = useTapScale();
  const categories = ['cut', 'beard', 'color', 'accessory'] as const;

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const group = items.filter((item) => item.category === category);
        if (group.length === 0) return null;

        return (
          <section key={category}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {CATEGORY_LABELS[category]}
            </h3>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {group.map((item) => {
                const locked = lockedPremium && item.is_premium;
                const active = selectedId === item.id;

                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileTap={tap}
                    disabled={locked}
                    aria-pressed={active}
                    onClick={() => onSelect(item)}
                    className="relative flex aspect-square flex-col items-center justify-end overflow-hidden rounded-2xl bg-violet-50 p-2 text-center disabled:opacity-45"
                  >
                    <Thumbnail src={item.preview_path} />

                    {active ? (
                      <motion.span
                        layoutId="catalog-selection"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-violet-600"
                      />
                    ) : null}

                    <span className="relative z-10 rounded-md bg-white/85 px-1 text-[11px] font-medium leading-tight text-violet-900">
                      {item.label}
                    </span>
                    {locked ? (
                      <span className="relative z-10 mt-1 text-[9px] uppercase text-violet-600">
                        premium
                      </span>
                    ) : null}
                  </motion.button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/**
 * Vignette du catalogue. Le fichier peut ne pas exister encore : on le masque
 * en silence plutôt que d'afficher une image cassée.
 */
function Thumbnail({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
