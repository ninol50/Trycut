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
  /** Page de paiement Whop. */
  paymentLink?: string;
  variant?: 'primary' | 'secondary';
  /**
   * Compte qui clique. Son email part avec le lien : c'est lui qui rattache
   * le paiement au compte, Whop ne transmettant pas de métadonnées sur une
   * page d'offre publique.
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
  const [confirming, setConfirming] = useState(false);
  const [billing, setBilling] = useState(email ?? '');
  const [error, setError] = useState<string | null>(null);

  // Premier appui : on demande confirmation de l'adresse. C'est elle qui
  // rattachera le paiement au compte — payer avec une autre adresse que
  // celle-ci, et les coupes n'arrivent jamais.
  const start = () => {
    if (!userId) {
      router.push('/inscription?suite=tarifs');
      return;
    }
    setError(null);
    setConfirming(true);
  };

  const go = async () => {
    const adresse = billing.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adresse)) {
      setError('Entre une adresse email valide.');
      return;
    }
    if (!userId || !paymentLink) {
      setError('Le paiement n’est pas disponible pour le moment.');
      return;
    }

    setBusy(true);
    setError(null);

    // On retient l'adresse avant de partir : au retour du paiement, le webhook
    // saura à quel compte le rattacher.
    try {
      await fetch('/api/billing-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: adresse }),
      });
    } catch {
      // Le départ vers le paiement ne doit pas dépendre de cet enregistrement.
    }

    track('checkout_completed', { plan, stage: 'redirect' });
    window.location.href = withCheckoutReference(paymentLink, userId, adresse);
  };

  if (confirming) {
    return (
      <div className="rounded-2xl border border-violet-200 p-4">
        <p className="text-sm font-semibold text-violet-900">
          Avec quelle adresse vas-tu payer ?
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Elle doit être la même sur la page de paiement, sinon tes coupes
          n’arriveront pas sur ce compte.
        </p>

        <input
          value={billing}
          onChange={(event) => setBilling(event.target.value)}
          type="email"
          inputMode="email"
          autoComplete="email"
          className="mt-3 w-full rounded-2xl border border-violet-200 px-4 py-3 text-base"
        />

        {error ? (
          <p role="alert" className="mt-2 text-sm text-violet-900">
            {error}
          </p>
        ) : null}

        <motion.button
          type="button"
          whileTap={tap}
          disabled={busy}
          onClick={() => void go()}
          className="btn-primary mt-3 w-full disabled:opacity-60"
        >
          {busy ? 'Redirection…' : 'Continuer vers le paiement'}
        </motion.button>

        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="mt-2 inline-flex min-h-[48px] w-full items-center justify-center text-sm text-slate-500 underline"
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <>
      <motion.button
        type="button"
        whileTap={tap}
        disabled={busy}
        onClick={() => start()}
        className={`${variant === 'primary' ? 'btn-primary' : 'btn-outline'} w-full disabled:opacity-60`}
      >
        {label}
      </motion.button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-violet-900">
          {error}
        </p>
      ) : null}
    </>
  );
}
