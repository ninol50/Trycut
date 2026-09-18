'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTapScale } from '@/components/motion';
import { track } from '@/lib/analytics';
import { WHOP_PLAN_IDS, withCheckoutReference, type PaidPlanId } from '@/lib/pricing';
import WhopCheckout from '@/components/WhopCheckout';

interface CheckoutButtonProps {
  plan: PaidPlanId;
  label: string;
  /** Lien de paiement Stripe. */
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
  /** Lien ouvert dans la fenêtre du site plutôt que sur le domaine du vendeur. */
  const [surPlace, setSurPlace] = useState<string | null>(null);

  const start = async () => {
    // Pas de compte : on passe par l'inscription. Sans identifiant, le webhook
    // ne saurait pas à qui attribuer les coupes.
    if (!userId) {
      router.push('/inscription?suite=tarifs');
      return;
    }

    track('checkout_completed', { plan, stage: 'redirect' });

    if (paymentLink) {
      const lien = withCheckoutReference(paymentLink, userId, email);

      // Whop sait afficher son paiement dans une fenêtre du site : le client ne
      // part plus sur un autre domaine au moment le plus fragile du parcours.
      // Les autres encaisseurs gardent la redirection.
      if (paymentLink.includes('whop.com')) {
        setSurPlace(lien);
        return;
      }

      window.location.href = lien;
      return;
    }

    // Repli : session créée côté serveur quand STRIPE_SECRET_KEY est posée.
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
        <p role="alert" className="mt-2 text-sm text-marine-900">
          {error}
        </p>
      ) : null}

      {surPlace ? (
        <WhopCheckout
          planId={WHOP_PLAN_IDS[plan]}
          href={surPlace}
          label={label}
          onClose={() => setSurPlace(null)}
        />
      ) : null}
    </>
  );
}
