'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import StyleIllustration from '@/components/catalog/StyleIllustration';
import type { HeroFrame } from '@/lib/demo-assets';

interface HeroTransformProps {
  frames: readonly HeroFrame[];
}

/** Temps passé sur la photo de départ, puis sur la coupe appliquée. */
const HOLD_BEFORE_MS = 2200;
const HOLD_AFTER_MS = 3200;

/**
 * Carte du hero : la même personne, dont les cheveux changent.
 *
 * On voit d'abord le visage tel qu'il est, puis la coupe prend sa place par un
 * fondu — seuls les cheveux bougent, le reste de la photo est identique des
 * deux côtés. C'est la démonstration du produit en une image, sans rien à
 * manipuler ; le comparateur qui se glisse au doigt est plus bas, dans la
 * section exemples.
 *
 * Le fondu est un simple changement d'opacité : c'est la seule animation que
 * `prefers-reduced-motion` autorise à conserver, donc rien à couper là-bas.
 * Ni échelle, ni rotation, ni séparateur qui balaye.
 *
 * Faute de photo, les mêmes étapes se jouent en dessin : la page ne montre
 * jamais un cadre vide sous une pastille qui tourne dans le vide.
 */
export default function HeroTransform({ frames }: HeroTransformProps) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [coiffe, setCoiffe] = useState(false);

  // Deux minuteries qui se relaient : montrer la coupe, puis passer à la
  // personne suivante. Une seule aurait fait clignoter les deux à la fois.
  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        if (coiffe) {
          setCoiffe(false);
          setStep((current) => (frames.length > 0 ? (current + 1) % frames.length : 0));
        } else {
          setCoiffe(true);
        }
      },
      coiffe ? HOLD_AFTER_MS : HOLD_BEFORE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [coiffe, frames.length]);

  const frame = frames[step];
  if (!frame) return null;

  const fondu = reduced ? 0.24 : 0.6;

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-3xl border border-violet-200 bg-violet-50"
      style={{ width: '100%', maxWidth: 320, aspectRatio: '3 / 4' }}
    >
      {/* Les deux états restent empilés : le fondu passe de l'un à l'autre sans
          que le cadre ne se vide un seul instant entre les deux. */}
      {([
        { key: 'avant', visible: !coiffe, source: frame.before },
        { key: 'apres', visible: coiffe, source: frame.after },
      ] as const).map((couche) => (
        <motion.div
          key={`${frame.id}-${couche.key}`}
          aria-hidden={couche.visible ? undefined : true}
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: couche.visible ? 1 : 0 }}
          transition={{ duration: fondu, ease: [0.16, 1, 0.3, 1] }}
        >
          {couche.source.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={couche.source.src}
              alt=""
              className="h-full w-full object-cover"
              loading={step === 0 ? 'eager' : 'lazy'}
            />
          ) : (
            <StyleIllustration slug={couche.source.slug} category="cut" />
          )}
        </motion.div>
      ))}

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

      {/* Pastille : elle nomme ce qui est à l'écran à cet instant. Le texte est
          lu à voix haute au changement, c'est la seule façon de suivre
          l'animation sans la voir. */}
      <motion.span
        key={`nom-${frame.id}-${coiffe ? 'apres' : 'avant'}`}
        role="status"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: fondu, ease: [0.16, 1, 0.3, 1] }}
        className="badge-dark absolute inset-x-0 bottom-4 mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-medium"
      >
        <span className="h-2 w-2 rounded-full bg-violet-400" aria-hidden="true" />
        {coiffe ? frame.label : 'Photo de départ'}
      </motion.span>
    </div>
  );
}
