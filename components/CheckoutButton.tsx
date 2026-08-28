'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTapScale } from '@/components/motion';
import { track } from '@/lib/analytics';

interface CheckoutButtonProps {
  plan: 'pack' | 'pass' | 'pack_oneshot';
  label: string;
  variant?: 'primary' | 'secondary';
  authenticated: boolean;
}

export default function CheckoutButton({
  plan,
  label,
  variant = 'primary',
  authenticated,
}: CheckoutButtonProps) {
  const router = useRouter();
  const tap = useTapScale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (!authenticated) {
      router.push('/inscription');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data: unknown = await response.json().catch(() => null);
      const url =
        typeof data === 'object' && data !== null && 'url' in data
          ? String((data as { url: unknown }).url)
          : null;

      if (!response.ok || !url) {
        setError('Le paiement n’est pas disponible pour le moment.');
        return;
      }

      track('checkout_completed', { plan, stage: 'redirect' });
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
        onClick={() => void start()}
        className={`${variant === 'primary' ? 'btn-primary' : 'btn-secondary'} w-full disabled:opacity-60`}
      >
        {busy ? 'Redirection…' : label}
      </motion.button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-violet-900">
          {error}
        </p>
      ) : null}
    </>
  );
}
