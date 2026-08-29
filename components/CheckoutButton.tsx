'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTapScale } from '@/components/motion';
import { track } from '@/lib/analytics';
import { withCheckoutReference } from '@/lib/pricing';

interface CheckoutButtonProps {
  plan: 'pack' | 'pass';
  label: string;
  /** Lien de paiement Stripe. Emprunté dès qu'il est présent. */
  paymentLink?: string;
  variant?: 'primary' | 'secondary';
  /**
   * Compte qui clique. Il part avec le lien de paiement : sans lui, Stripe
   * encaisse et le webhook ne sait à qui attribuer les coupes.
   */
  userId: string | null;
  email?: string | null;
}

export default function CheckoutButton({
  plan,
  label,
  paymentLink,
  variant = 'primary',
  userId,
  email,
}: CheckoutButtonProps) {
  const router = useRouter();
  const tap = useTapScale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (!userId) {
      router.push('/inscription?suite=tarifs');
      return;
    }

    track('checkout_completed', { plan, stage: 'redirect' });

    // Lien de paiement Stripe : le plus direct, aucune clé serveur requise.
    if (paymentLink) {
      window.location.href = withCheckoutReference(paymentLink, userId, email);
      return;
    }

    // Repli : Checkout créé côté serveur quand STRIPE_SECRET_KEY est configurée.
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
        className={`${variant === 'primary' ? 'btn-primary' : 'btn-outline'} w-full disabled:opacity-60`}
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
