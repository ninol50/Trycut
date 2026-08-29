'use client';

import { motion } from 'framer-motion';
import { useInView } from '@/components/motion';

const QUESTIONS = [
  {
    q: 'Que devient ma photo ?',
    a: 'Elle part chez notre prestataire d’IA le temps du rendu, puis elle est stockée dans un espace privé accessible à toi seul. Photos sources et résultats sont supprimés au bout de 30 jours. Tu peux tout effacer à tout moment depuis ton compte.',
  },
  {
    q: 'Ça marche sur cheveux crépus / bouclés ?',
    a: 'Oui. La texture fait partie des questions posées au départ et elle est transmise au modèle, qui conserve la définition naturelle des boucles au lieu de la lisser. Le catalogue contient des coupes pensées pour ces textures.',
  },
  {
    q: 'Il me faut un compte pour générer une coupe ?',
    a: 'Générer une coupe demande un abonnement : 3 € par semaine pour 5 coupes, ou 10 € par mois pour 23 coupes. Sans engagement.',
  },
  {
    q: 'Le résultat est-il fidèle à ce que fera mon coiffeur ?',
    a: 'C’est une projection, pas une promesse. Elle sert à trancher entre deux directions et à montrer une référence visuelle en salon. Le rendu final dépend de ton coiffeur.',
  },
  {
    q: 'Combien de temps prend un rendu ?',
    a: 'Une trentaine de secondes en moyenne. Tu peux quitter l’écran, le résultat t’attend.',
  },
  {
    q: 'Comment j’annule mon abonnement ?',
    a: 'Depuis ton compte, en deux clics, via le portail de paiement. L’accès reste actif jusqu’à la fin de la période déjà payée.',
  },
] as const;

export default function Faq() {
  const anim = useInView();

  return (
    <motion.section {...anim} className="section py-14">
      <h2 className="text-3xl">Questions fréquentes</h2>

      <div className="mt-8 overflow-hidden rounded-3xl border border-line">
        {QUESTIONS.map(({ q, a }) => (
          <details
            key={q}
            className="group border-b border-line px-5 py-4 last:border-b-0"
          >
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 font-semibold text-violet-900 marker:hidden">
              {q}
              <span className="shrink-0 text-violet-600 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm text-slate-500">{a}</p>
          </details>
        ))}
      </div>
    </motion.section>
  );
}
