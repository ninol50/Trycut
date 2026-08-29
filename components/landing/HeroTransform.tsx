'use client';

import { useEffect, useState } from 'react';
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import StyleIllustration from '@/components/catalog/StyleIllustration';
import type { HeroFrame } from '@/lib/demo-assets';

interface HeroTransformProps {
  frames: readonly HeroFrame[];
}

/** Durée d'une étape avant de passer à la personne suivante. */
const HOLD_MS = 5600;

/**
 * Carte du hero : l'avant/après se joue tout seul.
 *
 * Le séparateur va et vient sans qu'on y touche — c'est une démonstration, pas
 * un comparateur à manipuler ; celui de la section exemples, plus bas, se
 * glisse au doigt. Chaque personne tient l'écran quelques secondes, puis la
 * suivante prend sa place.
 *
 * Faute de photo, les mêmes étapes se jouent en dessin : la page ne montre
 * jamais un cadre vide sous une pastille qui tourne dans le vide.
 */
export default function HeroTransform({ frames }: HeroTransformProps) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  const progress = useMotionValue(reduced ? 0.5 : 0.16);
  const rightInset = useTransform(progress, (value) => `${(1 - value) * 100}%`);
  const clipPath = useMotionTemplate`inset(0 ${rightInset} 0 0)`;
  const dividerLeft = useTransform(progress, (value) => `${value * 100}%`);

  useEffect(() => {
    if (reduced) {
      progress.set(0.5);
      return;
    }
    const controls = animate(progress, 0.84, {
      duration: 2.8,
      ease: [0.16, 1, 0.3, 1],
      repeat: Infinity,
      repeatType: 'reverse',
    });
    return () => controls.stop();
  }, [reduced, progress]);

  useEffect(() => {
    if (frames.length <= 1) return;
    const timer = window.setInterval(
      () => setStep((current) => (current + 1) % frames.length),
      HOLD_MS,
    );
    return () => window.clearInterval(timer);
  }, [frames.length]);

  const frame = frames[step];
  if (!frame) return null;

  const layer = (side: HeroFrame['before'], alt: string) =>
    side.src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={side.src} alt={alt} className="h-full w-full object-cover" />
    ) : (
      <StyleIllustration slug={side.slug} category="cut" />
    );

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-3xl border border-violet-200 bg-violet-50"
      style={{ width: '100%', maxWidth: 320, aspectRatio: '3 / 4' }}
    >
      {/* Avant */}
      <motion.div
        key={`avant-${frame.id}`}
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {layer(frame.before, '')}
      </motion.div>

      {/* Après, révélé par le séparateur */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={reduced ? { clipPath: 'inset(0 50% 0 0)' } : { clipPath }}
      >
        <motion.div
          key={`apres-${frame.id}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {layer(frame.after, '')}
        </motion.div>
      </motion.div>

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

      <motion.span
        key={`nom-${frame.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="badge-dark absolute inset-x-0 bottom-4 mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-medium"
      >
        <span className="h-2 w-2 rounded-full bg-violet-400" aria-hidden="true" />
        {frame.label}
      </motion.span>
    </div>
  );
}
