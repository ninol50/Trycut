'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTapScale } from '@/components/motion';

interface Etat {
  cle: boolean;
  webhook: boolean;
  prix: number;
  modeTest: boolean;
  faits?: string[];
}

/**
 * Branchement de Stripe, depuis le site plutôt que depuis l'hébergeur.
 *
 * Une seule valeur à coller — la clé secrète — puis un bouton qui fait le
 * reste : reconnaître les trois tarifs et créer le webhook. Le secret de
 * signature du webhook n'est donné par Stripe qu'à la création ; l'obtenir
 * autrement obligerait à repasser par un ordinateur.
 */
export default function StripeSetup() {
  const tap = useTapScale();
  const [etat, setEtat] = useState<Etat | null>(null);
  const [cle, setCle] = useState('');
  const [busy, setBusy] = useState<'cle' | 'configurer' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const relire = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stripe');
      if (response.ok) setEtat((await response.json()) as Etat);
    } catch {
      // L'affichage de l'état ne doit pas casser la page.
    }
  }, []);

  useEffect(() => {
    void relire();
  }, [relire]);

  const envoyer = async (corps: object, quoi: 'cle' | 'configurer') => {
    setBusy(quoi);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/stripe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(corps),
      });
      const data = (await response.json().catch(() => null)) as
        | (Etat & { ok?: boolean; message?: string })
        | null;

      if (!response.ok) {
        setError(
          response.status === 403
            ? 'Ton compte n’est pas administrateur.'
            : (data?.message ?? 'L’opération a échoué. Réessaie.'),
        );
        return;
      }

      if (quoi === 'cle') {
        setCle('');
        setMessage('Clé enregistrée.');
      } else {
        setMessage(
          data?.faits?.length
            ? `C’est branché : ${data.faits.join(', ')}.`
            : 'C’est branché.',
        );
      }
      if (data) setEtat(data);
      await relire();
    } catch {
      setError('La connexion a été interrompue. Réessaie.');
    } finally {
      setBusy(null);
    }
  };

  const pret = Boolean(etat?.cle && etat.webhook);

  return (
    <section className="mt-10 rounded-3xl border border-line p-5">
      <h2 className="text-xl">Paiements Stripe</h2>
      <p className="mt-2 text-sm text-slate-500">
        Les boutons d’abonnement fonctionnent déjà. Ce réglage sert à créditer
        les coupes après un paiement : sans lui, l’argent rentre et le compte
        reste vide.
      </p>

      <div className="mt-4 rounded-2xl border border-line p-4 text-sm">
        <p className="font-semibold text-violet-900">
          {pret ? 'Stripe est branché.' : 'Stripe n’est pas encore branché.'}
        </p>
        <ul className="mt-2 space-y-1 text-slate-500">
          <li>· Clé secrète : {etat?.cle ? 'enregistrée' : 'absente'}</li>
          <li>· Webhook signé : {etat?.webhook ? 'oui' : 'non'}</li>
          <li>· Tarifs reconnus : {etat?.prix ?? 0} sur 3</li>
        </ul>
        {etat?.modeTest ? (
          <p className="mt-2 font-semibold text-violet-900">
            Attention : c’est une clé de test. Aucun vrai paiement ne passera.
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-violet-900">Clé secrète Stripe</p>
        <p className="mt-1 text-xs text-slate-500">
          Chez Stripe : Développeurs → Clés d’API → Secret key. Commence par « sk_ ».
          Elle n’est jamais réaffichée ici.
        </p>
        <input
          value={cle}
          onChange={(event) => setCle(event.target.value)}
          type="password"
          autoComplete="off"
          spellCheck={false}
          className="mt-2 w-full rounded-2xl border border-violet-200 px-4 py-3 text-base"
        />
        <motion.button
          type="button"
          whileTap={tap}
          disabled={busy !== null || cle.trim().length < 10}
          onClick={() => void envoyer({ action: 'cle', valeur: cle.trim() }, 'cle')}
          className="btn-outline mt-2 w-full disabled:opacity-60"
        >
          {busy === 'cle' ? 'Un instant…' : 'Enregistrer la clé'}
        </motion.button>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-2xl bg-violet-50 p-3 text-sm text-violet-900">
          {error}
        </p>
      ) : null}

      {message ? (
        <p role="status" className="mt-4 rounded-2xl bg-violet-50 p-3 text-sm text-violet-900">
          {message}
        </p>
      ) : null}

      <motion.button
        type="button"
        whileTap={tap}
        disabled={busy !== null || !etat?.cle}
        onClick={() => void envoyer({ action: 'configurer' }, 'configurer')}
        className="btn-primary mt-4 w-full disabled:opacity-60"
      >
        {busy === 'configurer' ? 'Configuration…' : 'Brancher Stripe automatiquement'}
      </motion.button>
      <p className="mt-2 text-xs text-slate-500">
        Retrouve les trois tarifs et crée le webhook. À relancer si tu changes
        de clé ou d’adresse de site.
      </p>
    </section>
  );
}
