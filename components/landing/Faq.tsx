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
    a: 'Oui. Tu peux parcourir le catalogue librement, mais générer une coupe demande un abonnement — Pack à 9,99 € pour 15 coupes par mois, Pass à 17,90 € pour 50. Tu résilies quand tu veux.',
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
    <motion.section {...anim} className="section py-10">
      <h2 className="text-xl">Questions fréquentes</h2>

      <div className="mt-5 space-y-2">
        {QUESTIONS.map(({ q, a }) => (
          <details
            key={q}
            className="group rounded-2xl border border-violet-50 bg-white p-4 shadow-violet"
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
