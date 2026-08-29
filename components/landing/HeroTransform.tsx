'use client';

import { useEffect, useState } from 'react';
import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import StyleIllustration from '@/components/catalog/StyleIllustration';

export interface HeroLook {
  slug: string;
  label: string;
  /** Photo « après ». Absente : la coupe est dessinée. */
  src: string | null;
}

interface HeroTransformProps {
  /** Photo de départ, commune à tous les looks. Absente : dessin. */
  baseSrc: string | null;
  baseSlug: string;
  looks: readonly HeroLook[];
}

/** Durée d'affichage d'une coupe avant de passer à la suivante. */
const HOLD_MS = 5200;

/**
 * Carte du hero : la coupe change toute seule, et le séparateur avant/après
 * glisse sans qu'on y touche. C'est la démonstration du produit, pas une
 * vignette décorative — l'ancienne carte affichait une silhouette vide sous une
 * pastille « Transformation en cours » qui ne se résolvait jamais, ce qui
 * donnait exactement l'impression d'un rendu planté.
 *
 * Les visuels sont dessinés tant qu'aucune photo n'est déposée : on ne met pas
 * le visage de quelqu'un sur une page marchande sans son accord.
 */
export default function HeroTransform({ baseSrc, baseSlug, looks }: HeroTransformProps) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  // Le séparateur va et vient tout seul entre 18 % et 82 %.
  const progress = useMotionValue(reduced ? 0.5 : 0.18);
  const rightInset = useTransform(progress, (value) => `${(1 - value) * 100}%`);
  const clipPath = useMotionTemplate`inset(0 ${rightInset} 0 0)`;
  const dividerLeft = useTransform(progress, (value) => `${value * 100}%`);

  useEffect(() => {
    if (reduced) {
      progress.set(0.5);
      return;
    }
    const controls = animate(progress, 0.82, {
      duration: 3.4,
      ease: [0.16, 1, 0.3, 1],
      repeat: Infinity,
      repeatType: 'reverse',
    });
    return () => controls.stop();
  }, [reduced, progress]);

  useEffect(() => {
    if (looks.length <= 1) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % looks.length),
      HOLD_MS,
    );
    return () => window.clearInterval(timer);
  }, [looks.length]);

  const look = looks[index];

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-3xl border border-violet-200 bg-violet-50"
      style={{ width: '100%', maxWidth: 320, aspectRatio: '3 / 4' }}
    >
      {/* Avant : la photo de départ, inchangée */}
      {baseSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={baseSrc} alt="" aria-hidden="true" className="h-full w-full object-cover" />
      ) : (
        <StyleIllustration slug={baseSlug} category="cut" />
      )}

      {/* Après : la coupe choisie, révélée par le séparateur */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={reduced ? { clipPath: 'inset(0 50% 0 0)' } : { clipPath }}
      >
        {look ? (
          <motion.div
            key={look.slug}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {look.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={look.src} alt="" className="h-full w-full object-cover" />
            ) : (
              <StyleIllustration slug={look.slug} category="cut" />
            )}
          </motion.div>
        ) : null}
      </motion.div>

      {/* Trait du séparateur */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-[2px] bg-violet-600"
        style={reduced ? { left: '50%' } : { left: dividerLeft }}
      />

      {/* Équerres aux quatre coins */}
      {(
        [
          'left-4 top-4 border-l-2 border-t-2 rounded-tl-lg',
          'right-4 top-4 border-r-2 border-t-2 rounded-tr-lg',
          'left-4 bottom-4 border-b-2 border-l-2 rounded-bl-lg',
          'right-4 bottom-4 border-b-2 border-r-2 rounded-br-lg',
        ] as const
      ).map((corner) => (
        <span
          key={corner}
          aria-hidden="true"
          className={`pointer-events-none absolute h-7 w-7 border-violet-400 ${corner}`}
        />
      ))}

      {/* Nom de la coupe : un état qui avance, pas un chargement sans fin */}
      {look ? (
        <motion.span
          key={look.label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="badge-dark absolute inset-x-0 bottom-4 mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-medium"
        >
          <span className="h-2 w-2 rounded-full bg-violet-400" aria-hidden="true" />
          {look.label}
        </motion.span>
      ) : null}
    </div>
  );
}
