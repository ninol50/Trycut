'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { EASE } from '@/components/motion';

/** Une notification toutes les deux minutes environ, visible cinq secondes. */
const AFFICHAGE_MS = 5000;
const INTERVALLE_MS = 120_000;
const PREMIERE_MS = 9000;

/** « il y a 3 min », « il y a 2 h », « hier ». Rien d'autre. */
function ilYA(iso: string): string {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `il y a ${minutes} min`;

  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  return heures < 48 ? 'hier' : `il y a ${Math.round(heures / 24)} jours`;
}

/**
 * Notifications d'activité réelle, en bas de l'écran.
 *
 * Chaque passage correspond à une coupe qui a vraiment été générée, et n'en
 * dit que l'heure : personne n'est nommé. La liste arrive du serveur ; ce
 * composant ne fabrique rien, il fait défiler. Sans activité, il ne rend rien
 * plutôt que d'annoncer une coupe qui n'a pas eu lieu — une preuve sociale
 * fausse est un mensonge au visiteur, et une pratique commerciale trompeuse.
 */
export default function ActivityToasts({ cuts }: { cuts: readonly string[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (cuts.length === 0) return;

    // Première apparition différée : personne n'a envie d'une notification
    // avant même d'avoir lu le titre de la page.
    const depart = setTimeout(() => setVisible(true), PREMIERE_MS);
    return () => clearTimeout(depart);
  }, [cuts.length]);

  useEffect(() => {
    if (cuts.length === 0 || !visible) return;

    const cacher = setTimeout(() => setVisible(false), AFFICHAGE_MS);
    return () => clearTimeout(cacher);
  }, [cuts.length, visible, index]);

  useEffect(() => {
    if (cuts.length === 0 || visible) return;

    const suivante = setTimeout(() => {
      setIndex((actuel) => (actuel + 1) % cuts.length);
      setVisible(true);
    }, INTERVALLE_MS);
    return () => clearTimeout(suivante);
  }, [cuts.length, visible]);

  if (cuts.length === 0) return null;

  const at = cuts[index];
  if (!at) return null;

  return (
    <div
      aria-live="polite"
      // Jamais devant un bouton : la bande informe, elle ne doit rien intercepter.
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
    >
      <AnimatePresence mode="wait">
        {visible ? (
          <motion.p
            key={`${at}-${index}`}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: reduced ? 0.2 : 0.45, ease: EASE }}
            className="flex max-w-[520px] items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-marine-900"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-marine-600" aria-hidden="true" />
            <span className="truncate">Une coupe vient d’être générée</span>
            <span className="shrink-0 text-slate-500">{ilYA(at)}</span>
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
