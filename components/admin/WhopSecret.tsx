'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTapScale } from '@/components/motion';

interface Etat {
  secret: boolean;
  cleApi: boolean;
  test?: { ok: boolean; abonnements?: number; message?: string };
}

/**
 * Réglages Whop.
 *
 * Ils existent ici parce que le tableau de bord de l'hébergeur est
 * inutilisable depuis un téléphone. Les valeurs partent en écriture seule :
 * jamais relues, jamais réaffichées, on ne montre que leur présence.
 */
export default function WhopSecret() {
  const tap = useTapScale();
  const [etat, setEtat] = useState<Etat | null>(null);
  const [secret, setSecret] = useState('');
  const [cle, setCle] = useState('');
  const [busy, setBusy] = useState<'secret' | 'cle' | 'test' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const relire = useCallback(async (test = false) => {
    try {
      const response = await fetch(`/api/admin/whop${test ? '?test=1' : ''}`);
      if (response.ok) setEtat((await response.json()) as Etat);
    } catch {
      // L'affichage de l'état ne doit pas casser la page.
    }
  }, []);

  useEffect(() => {
    void relire();
  }, [relire]);

  const enregistrer = async (champ: 'secret' | 'cle', valeur: string) => {
    const propre = valeur.trim();
    if (propre.length < 10) {
      setError('Colle la valeur complète.');
      return;
    }

    setBusy(champ);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/whop', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ champ, valeur: propre }),
      });

      if (!response.ok) {
        setError(
          response.status === 403
            ? 'Ton compte n’est pas administrateur.'
            : 'L’enregistrement a échoué. Réessaie.',
        );
        return;
      }

      if (champ === 'secret') setSecret('');
      else setCle('');
      setMessage('Enregistré.');
      await relire();
    } catch {
      setError('La connexion a été interrompue. Réessaie.');
    } finally {
      setBusy(null);
    }
  };

  const tester = async () => {
    setBusy('test');
    setError(null);
    setMessage(null);
    await relire(true);
    setBusy(null);
  };

  const champ = (
    titre: string,
    aide: string,
    valeur: string,
    setValeur: (value: string) => void,
    id: 'secret' | 'cle',
    pose: boolean,
  ) => (
    <div className="mt-5">
      <p className="text-sm font-semibold text-violet-900">
        {titre} {pose ? '· enregistrée' : '· absente'}
      </p>
      <p className="mt-1 text-xs text-slate-500">{aide}</p>
      <input
        value={valeur}
        onChange={(event) => setValeur(event.target.value)}
        type="password"
        autoComplete="off"
        spellCheck={false}
        className="mt-2 w-full rounded-2xl border border-violet-200 px-4 py-3 text-base"
      />
      <motion.button
        type="button"
        whileTap={tap}
        disabled={busy !== null}
        onClick={() => void enregistrer(id, valeur)}
        className="btn-outline mt-2 w-full disabled:opacity-60"
      >
        {busy === id ? 'Un instant…' : 'Enregistrer'}
      </motion.button>
    </div>
  );

  return (
    <section className="mt-10 rounded-3xl border border-line p-5">
      <h2 className="text-xl">Paiements Whop</h2>
      <p className="mt-2 text-sm text-slate-500">
        La clé API suffit à faire fonctionner les abonnements : le site demande
        à Whop qui est à jour de paiement. Le secret de webhook est facultatif.
      </p>

      {champ(
        'Clé API',
        'Chez Whop : Développeur → Clés API. Commence par « api ». C’est elle qui ouvre et ferme l’accès.',
        cle,
        setCle,
        'cle',
        Boolean(etat?.cleApi),
      )}

      {champ(
        'Secret de webhook',
        'Facultatif. Sur la page du webhook, colonne Secret. Commence par « ws_ ».',
        secret,
        setSecret,
        'secret',
        Boolean(etat?.secret),
      )}

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

      {etat?.test ? (
        <p
          role="status"
          className="mt-4 rounded-2xl bg-violet-50 p-3 text-sm text-violet-900"
        >
          {etat.test.ok
            ? `Connexion établie. ${etat.test.abonnements} abonnement${(etat.test.abonnements ?? 0) > 1 ? 's' : ''} valide${(etat.test.abonnements ?? 0) > 1 ? 's' : ''} chez Whop.`
            : etat.test.message}
        </p>
      ) : null}

      <motion.button
        type="button"
        whileTap={tap}
        disabled={busy !== null}
        onClick={() => void tester()}
        className="btn-primary mt-4 w-full disabled:opacity-60"
      >
        {busy === 'test' ? 'Test en cours…' : 'Tester la connexion à Whop'}
      </motion.button>
    </section>
  );
}
