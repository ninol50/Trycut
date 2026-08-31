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
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    // Pas de compte : on passe par l'inscription. C'est là que l'adresse est
    // fixée, et c'est elle qui rattachera le paiement au compte.
    if (!userId) {
      router.push('/inscription?suite=tarifs');
      return;
    }
    if (!paymentLink) {
      setError('Le paiement n’est pas disponible pour le moment.');
      return;
    }

    setBusy(true);
    const adresse = (email ?? '').trim().toLowerCase();

    // On retient l'adresse du compte comme adresse de paiement : au retour, le
    // webhook saura à qui rattacher l'encaissement.
    if (adresse) {
      try {
        await fetch('/api/billing-email', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: adresse }),
        });
      } catch {
        // Le départ vers le paiement ne dépend pas de cet enregistrement.
      }
    }

    track('checkout_completed', { plan, stage: 'redirect' });
    window.location.href = withCheckoutReference(paymentLink, userId, adresse || null);
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
