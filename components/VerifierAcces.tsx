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
    'Aucun paiement trouvé pour l’adresse de ton compte. Si tu viens de payer, attends une minute et réessaie — ou indique ci-dessous l’adresse avec laquelle tu as payé.',
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
  const [autreEmail, setAutreEmail] = useState('');

  const verifier = async (silencieux = false) => {
    setBusy(true);
    if (!silencieux) setEtat(null);

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

  /**
   * L'adresse du paiement n'est pas toujours celle du compte : la page de
   * paiement pré-remplit celle du compte Whop, pas celle de Trycut. Sans ce
   * champ, ces clients-là paient et ne sont jamais crédités — aucun rattrapage
   * automatique ne peut deviner une adresse qu'il n'a jamais vue.
   */
  const enregistrerEmail = async () => {
    const email = autreEmail.trim();
    if (!email.includes('@')) return;

    setBusy(true);
    try {
      const response = await fetch('/api/billing-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        setEtat('indisponible');
        return;
      }
    } catch {
      setEtat('indisponible');
      return;
    } finally {
      setBusy(false);
    }

    // Enregistrée : on retente aussitôt, sinon il faudrait appuyer deux fois.
    await verifier(true);
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

      {etat === 'introuvable' ? (
        <div className="mt-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-marine-900">
              Adresse utilisée pour payer
            </span>
            <input
              value={autreEmail}
              onChange={(event) => setAutreEmail(event.target.value)}
              type="email"
              autoComplete="email"
              inputMode="email"
              className="w-full rounded-2xl border border-marine-200 px-4 py-3 text-base"
            />
          </label>
          <motion.button
            type="button"
            whileTap={tap}
            disabled={busy || !autreEmail.includes('@')}
            onClick={() => void enregistrerEmail()}
            className="btn-outline mt-2 w-full disabled:opacity-60"
          >
            {busy ? 'Vérification…' : 'Vérifier avec cette adresse'}
          </motion.button>
        </div>
      ) : null}
    </div>
  );
}
