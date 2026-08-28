'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTapScale } from '@/components/motion';

/** Ouvre le portail client Stripe (résiliation, factures, moyens de paiement). */
export default function PortalButton() {
  const tap = useTapScale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/portal', { method: 'POST' });
      const data: unknown = await response.json().catch(() => null);
      const url =
        typeof data === 'object' && data !== null && 'url' in data
          ? String((data as { url: unknown }).url)
          : null;

      if (!response.ok || !url) {
        setError('Aucun abonnement à gérer pour le moment.');
        return;
      }
      window.location.href = url;
    } catch {
      setError('La connexion a été interrompue. Réessaie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        whileTap={tap}
        disabled={busy}
        onClick={() => void open()}
        className="btn-secondary w-full disabled:opacity-60"
      >
        {busy ? 'Ouverture…' : 'Gérer mon abonnement'}
      </motion.button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-slate-500">
          {error}
        </p>
      ) : null}
    </>
  );
}
