'use client';

import { motion } from 'framer-motion';
import type { Choice } from '@/lib/onboarding';
import { useTap } from '@/lib/motion';

interface ChoiceGridProps {
  choices: readonly Choice[];
  selected: string | string[] | undefined;
  onSelect: (value: string) => void;
  /** Vignettes illustrées : deux colonnes, pictogramme au-dessus du libellé. */
  illustrated?: boolean;
  multi?: boolean;
}

/** Pictogrammes de substitution tant que /public/demo n'est pas rempli. */
const GLYPHS: Record<string, string> = {
  oval: '⬭',
  round: '◯',
  square: '▢',
  oblong: '▯',
  unknown: '?',
  classic: '◈',
  street: '◆',
  sport: '▲',
  neat: '◇',
};

export function ChoiceGrid({
  choices,
  selected,
  onSelect,
  illustrated = false,
  multi = false,
}: ChoiceGridProps) {
  const tap = useTap();
  const isSelected = (value: string): boolean =>
    Array.isArray(selected) ? selected.includes(value) : selected === value;

  return (
    <div className={illustrated ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
      {choices.map((choice) => {
        const active = isSelected(choice.value);
        return (
          <motion.button
            key={choice.value}
            type="button"
            whileTap={tap}
            onClick={() => onSelect(choice.value)}
            aria-pressed={multi ? active : undefined}
            className={[
              'relative flex min-h-tap items-center rounded-2xl border-2 px-4 py-3 text-left',
              'text-body font-semibold transition-colors',
              illustrated ? 'flex-col items-center justify-center gap-2 py-6 text-center' : '',
              active
                ? 'border-violet-600 bg-violet-50 text-violet-900'
                : 'border-violet-200 bg-white text-ink hover:border-violet-400',
            ].join(' ')}
          >
            {illustrated && (
              <span className="text-[2rem] leading-none text-violet-400" aria-hidden="true">
                {GLYPHS[choice.value] ?? '◐'}
              </span>
            )}
            <span>{choice.label}</span>
            {multi && (
              <span
                className={[
                  'ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                  active ? 'border-violet-600 bg-violet-600 text-white' : 'border-violet-200',
                ].join(' ')}
                aria-hidden="true"
              >
                {active ? '✓' : ''}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
