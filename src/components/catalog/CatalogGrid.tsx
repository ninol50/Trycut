'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DemoImage } from '@/components/ui/DemoImage';
import { useTap } from '@/lib/motion';
import { CATEGORY_LABELS, categoryOrder } from '@/lib/catalog';
import type { CatalogItemView } from '@/lib/catalog';
import type { CatalogCategory } from '@/lib/types/db';

interface CatalogGridProps {
  items: CatalogItemView[];
  selectedId: string | null;
  onSelect: (item: CatalogItemView) => void;
  goal?: string;
  /** Le pass mensuel déverrouille le catalogue premium. */
  premiumUnlocked?: boolean;
}

/**
 * Le seul endroit de l'app où la densité visuelle est élevée.
 *
 * La micro-interaction clé : la bordure violette de sélection est partagée
 * entre les cartes via `layoutId`, elle se déplace au lieu d'apparaître.
 */
export function CatalogGrid({
  items,
  selectedId,
  onSelect,
  goal,
  premiumUnlocked = false,
}: CatalogGridProps) {
  const tap = useTap();
  const order = categoryOrder(goal).filter((category) =>
    items.some((item) => item.category === category),
  );
  const [active, setActive] = useState<CatalogCategory>(order[0] ?? 'cut');

  const visible = items.filter((item) => item.category === active);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-6 text-body text-slate-500">
        Le catalogue n’est pas encore chargé. Vérifie la configuration Supabase
        et le seed (<code className="break-all">supabase/migrations/0004_seed_catalog.sql</code>).
      </p>
    );
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Catégories"
        className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {order.map((category) => (
          <button
            key={category}
            role="tab"
            type="button"
            aria-selected={active === category}
            onClick={() => setActive(category)}
            className={[
              'min-h-tap shrink-0 rounded-full border px-4 text-body-sm font-semibold transition-colors',
              active === category
                ? 'border-violet-600 bg-violet-600 text-white'
                : 'border-violet-200 bg-white text-violet-900',
            ].join(' ')}
          >
            {CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visible.map((item) => {
          const locked = item.isPremium && !premiumUnlocked;
          const isSelected = item.id === selectedId;

          return (
            <motion.button
              key={item.id}
              type="button"
              whileTap={locked ? undefined : tap}
              onClick={() => !locked && onSelect(item)}
              aria-pressed={isSelected}
              aria-disabled={locked}
              className={[
                'relative rounded-2xl p-1 text-left transition-colors',
                // Avec le bloc CTA de la landing, c'est la seule surface
                // colorée autorisée par la direction artistique.
                isSelected ? 'bg-violet-50' : '',
                locked ? 'cursor-not-allowed opacity-60' : '',
              ].join(' ')}
            >
              {isSelected && (
                <motion.span
                  layoutId="catalog-selection"
                  className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-violet-600"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  aria-hidden="true"
                />
              )}

              <DemoImage
                src={item.previewPath}
                alt={item.label}
                width={400}
                height={400}
                glyph="✂"
                sizes="(max-width: 640px) 45vw, 180px"
                className="w-full rounded-2xl"
              />

              <div
                className={[
                  'mt-2 rounded-b-2xl px-2 pb-2',
                  isSelected ? 'text-violet-900' : 'text-ink',
                ].join(' ')}
              >
                <p className="text-body-sm font-semibold leading-snug">{item.label}</p>
                {locked && (
                  <p className="mt-1 text-body-sm text-violet-600">Premium</p>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
