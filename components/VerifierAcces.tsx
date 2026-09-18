'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTapScale } from '@/components/motion';

type Etat = 'accorde' | 'deja' | 'introuvable' | 'indisponible';

/**
 * Messages fixes, comme pour les erreurs de rendu : chaque état dit quoi faire
 * ensuite. « Introuvable » est le seul cas ambigu — un paiement fait il y a dix
 * secondes peut ne pas encore être visible chez Whop — donc il invite à
 * réessayer au lieu d'affirmer qu'aucun paiement n'existe.
 */
const MESSAGES: Record<Etat, string> = {
  accorde: 'C’est bon, tes coupes sont créditées.',
  deja: 'Ton accès est déjà actif.',
  introuvable:
    'Aucun paiement trouvé pour cette adresse. Si tu viens de payer, attends une minute et réessaie. Si tu as payé avec une autre adresse, écris-nous.',
  indisponible: 'La vérification est indisponible pour le moment. Réessaie dans un instant.',
};

/**
 * « J'ai payé, ouvre-moi l'accès. »
 *
 * Le paiement passe par un prestataire, et le message qui prévient le site peut
 * se perdre. Sans ce bouton, un client qui a payé n'a aucun recours : il voit
 * un cadenas et doit écrire. Ici, c'est le site qui va demander à Whop, et
 * l'accès s'ouvre dans la seconde qui suit.
 */
export default function VerifierAcces({ discret = false }: { discret?: boolean }) {
  const router = useRouter();
  const tap = useTapScale();
  const [busy, setBusy] = useState(false);
  const [etat, setEtat] = useState<Etat | null>(null);

  const verifier = async () => {
    setBusy(true);
    setEtat(null);

    try {
      const response = await fetch('/api/whop/verifier', { method: 'POST' });
      const data = (await response.json().catch(() => null)) as { etat?: Etat } | null;
      const resultat = data?.etat ?? 'indisponible';
      setEtat(resultat);

      // L'accès vient de changer : la page doit être relue côté serveur, sinon
      // le cadenas reste affiché alors qu'il est levé.
      if (resultat === 'accorde' || resultat === 'deja') router.refresh();
    } catch {
      setEtat('indisponible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <motion.button
        type="button"
        whileTap={tap}
        disabled={busy}
        onClick={() => void verifier()}
        className={`${discret ? 'btn-outline' : 'btn-primary'} w-full disabled:opacity-60`}
      >
        {busy ? 'Vérification…' : 'J’ai déjà payé'}
      </motion.button>

      {etat ? (
        <p
          role="status"
          className="mt-3 rounded-2xl bg-marine-50 p-3 text-sm text-marine-900"
        >
          {MESSAGES[etat]}
        </p>
      ) : null}
    </div>
  );
}
