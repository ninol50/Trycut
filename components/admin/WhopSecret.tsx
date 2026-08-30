'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTapScale } from '@/components/motion';

/**
 * Champ de pose du secret du webhook Whop.
 *
 * Il existe parce que le tableau de bord de l'hébergeur est inutilisable
 * depuis un téléphone. Le secret part en écriture seule : il n'est jamais
 * relu ni réaffiché, on ne montre que sa présence.
 */
export default function WhopSecret() {
  const tap = useTapScale();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/admin/whop')
      .then((response) => (response.ok ? response.json() : { configured: false }))
      .then((data: { configured?: boolean }) => setConfigured(Boolean(data.configured)))
      .catch(() => setConfigured(false));
  }, []);

  const save = async () => {
    const value = secret.trim();
    if (value.length < 10) {
      setError('Colle le secret complet, il commence par whsec_.');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/whop', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret: value }),
      });

      if (!response.ok) {
        setError(
          response.status === 403
            ? 'Ton compte n’est pas administrateur.'
            : 'L’enregistrement a échoué. Réessaie.',
        );
        return;
      }

      setSecret('');
      setConfigured(true);
      setMessage('Secret enregistré. Les paiements créditent maintenant les comptes.');
    } catch {
      setError('La connexion a été interrompue. Réessaie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-10 rounded-3xl border border-line p-5">
      <h2 className="text-xl">Paiements Whop</h2>

      <p className="mt-2 text-sm text-slate-500">
        {configured === null
          ? 'Vérification…'
          : configured
            ? 'Un secret est enregistré. Les paiements Whop créditent les comptes automatiquement.'
            : 'Aucun secret enregistré : un paiement Whop n’ouvre aucun accès pour le moment.'}
      </p>

      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-medium text-violet-900">
          Secret de signature
        </span>
        <input
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="whsec_…"
          className="w-full rounded-2xl border border-violet-200 px-4 py-3 text-base"
        />
        <span className="mt-1 block text-xs text-slate-500">
          Il n’est jamais réaffiché. Le recoller le remplace.
        </span>
      </label>

      {error ? (
        <p role="alert" className="mt-3 rounded-2xl bg-violet-50 p-3 text-sm text-violet-900">
          {error}
        </p>
      ) : null}

      {message ? (
        <p role="status" className="mt-3 rounded-2xl bg-violet-50 p-3 text-sm text-violet-900">
          {message}
        </p>
      ) : null}

      <motion.button
        type="button"
        whileTap={tap}
        disabled={busy}
        onClick={() => void save()}
        className="btn-primary mt-4 w-full disabled:opacity-60"
      >
        {busy ? 'Un instant…' : 'Enregistrer le secret'}
      </motion.button>
    </section>
  );
}
