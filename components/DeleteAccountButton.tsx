'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTapScale } from '@/components/motion';

/** Suppression réelle. Confirmation explicite, jamais en un clic. */
export default function DeleteAccountButton() {
  const tap = useTapScale();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/account', { method: 'DELETE' });
      if (!response.ok) {
        setError('La suppression a échoué. Réessaie.');
        return;
      }
      window.location.href = '/';
    } catch {
      setError('La connexion a été interrompue. Réessaie.');
    } finally {
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <motion.button
        type="button"
        whileTap={tap}
        onClick={() => setConfirming(true)}
        className="w-full py-3 text-sm font-semibold text-slate-500 underline"
      >
        Supprimer mon compte
      </motion.button>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200 p-4">
      <p className="text-sm text-violet-900">
        Cette action supprime définitivement ton compte, tes essais et toutes tes photos.
        Elle est irréversible.
      </p>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-violet-900">
          {error}
        </p>
      ) : null}

      <div className="mt-4 space-y-2">
        <motion.button
          type="button"
          whileTap={tap}
          disabled={busy}
          onClick={() => void remove()}
          className="w-full rounded-full bg-violet-900 px-6 py-4 text-base font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Suppression…' : 'Oui, tout supprimer'}
        </motion.button>
        <motion.button
          type="button"
          whileTap={tap}
          onClick={() => setConfirming(false)}
          className="btn-secondary w-full"
        >
          Annuler
        </motion.button>
      </div>
    </div>
  );
}
