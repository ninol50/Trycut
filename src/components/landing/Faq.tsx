'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/motion';

const QUESTIONS: readonly { q: string; a: string }[] = [
  {
    q: 'Le résultat ressemble vraiment à moi ?',
    a: 'La génération repart de ta photo et conserve ton visage, l’angle de prise de vue et l’éclairage. Seule la zone concernée est régénérée.',
  },
  {
    q: 'Que devient ma photo ?',
    a: 'Elle est envoyée à notre prestataire d’IA pour le traitement, stockée sur un espace privé accessible uniquement à toi, et supprimée automatiquement au bout de 30 jours. Tu peux tout effacer à tout moment depuis ton compte.',
  },
  {
    q: 'Faut-il un abonnement ?',
    a: 'Non. Le pack à 4,99 € est un paiement unique valable 6 mois. Le pass mensuel existe pour ceux qui publient souvent, mais ce n’est pas l’offre par défaut.',
  },
  {
    q: 'Quelle photo utiliser ?',
    a: 'Un visage de face, bien éclairé, sans casquette ni lunettes de soleil. Un JPG ou un PNG de moins de 10 Mo.',
  },
  {
    q: 'Je peux montrer le résultat à mon coiffeur ?',
    a: 'C’est même l’idée. Tu télécharges l’image au format 9:16 et tu la montres directement en rendez-vous.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="space-y-3">
      {QUESTIONS.map((item, index) => {
        const isOpen = open === index;
        return (
          <div key={item.q} className="rounded-2xl border border-violet-200 bg-white">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex min-h-tap w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-body font-semibold text-violet-900">{item.q}</span>
              <span
                className="shrink-0 text-violet-600 transition-transform"
                style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}
                aria-hidden="true"
              >
                +
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0.15 : 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-body text-slate-500">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
