'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTapScale } from '@/components/motion';

export type ErrorKind =
  | 'quota'
  | 'network'
  | 'file'
  | 'no_face'
  | 'capacity'
  | 'rate'
  | 'rejected'
  | 'payment';

/** Messages imposés (section 7.2). Jamais d'écran blanc. */
export const ERROR_MESSAGES: Record<ErrorKind, string> = {
  quota: 'Il te reste 0 coupe. Prends un abonnement pour générer.',
  network: 'La connexion a été interrompue. Réessaie.',
  file: 'Format non supporté. Utilise un JPG ou un PNG de moins de 10 Mo.',
  no_face: 'On ne détecte pas de visage sur cette photo. Reprends-en une de face.',
  capacity:
    'Beaucoup de monde en ce moment. Reviens dans quelques heures ou passe en pack pour un accès prioritaire.',
  rate: 'Tu as lancé plusieurs coupes d’affilée. Laisse passer quelques minutes et réessaie.',
  rejected: 'Ton compte n’a pas accès au service.',
  payment: 'Ton dernier paiement a été refusé. Mets ton moyen de paiement à jour.',
};

interface ErrorStateProps {
  kind: ErrorKind;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ kind, message, onRetry }: ErrorStateProps) {
  const tap = useTapScale();
  const showPricing = kind === 'quota' || kind === 'capacity' || kind === 'payment';

  return (
    <div className="section py-10" role="alert">
      <div className="rounded-2xl bg-violet-50 p-5">
        <p className="font-display text-lg font-bold text-violet-900">
          {message ?? ERROR_MESSAGES[kind]}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {showPricing ? (
          <Link href="/tarifs" className="btn-primary w-full">
            Voir les offres
          </Link>
        ) : null}

        {onRetry ? (
          <motion.button
            type="button"
            whileTap={tap}
            onClick={onRetry}
            className={showPricing ? 'btn-outline w-full' : 'btn-primary w-full'}
          >
            Réessayer
          </motion.button>
        ) : null}
      </div>
    </div>
  );
}
