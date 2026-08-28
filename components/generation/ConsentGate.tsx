'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTapScale } from '@/components/motion';

const CONSENT_KEY = 'trycut_consent_v1';

export function hasStoredConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CONSENT_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Écran de consentement affiché AVANT le premier upload. Case jamais pré-cochée. */
export default function ConsentGate({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  const tap = useTapScale();

  const accept = () => {
    try {
      window.localStorage.setItem(CONSENT_KEY, 'true');
    } catch {
      // navigation privée : le consentement vaut pour cette session
    }
    onAccept();
  };

  return (
    <div className="section py-10">
      <h1 className="text-2xl">Avant d’envoyer ta photo</h1>

      <div className="mt-6 space-y-3 text-base text-slate-500">
        <p>
          Ta photo est transmise à un prestataire d’intelligence artificielle le temps de
          générer le rendu. Elle est ensuite conservée dans un espace privé auquel toi seul
          as accès.
        </p>
        <p>
          Photo source et résultat sont supprimés automatiquement au bout de 30 jours — sous
          24 heures pour un essai sans compte. Tu peux tout effacer avant, depuis ton compte.
        </p>
      </div>

      <label className="mt-6 flex items-start gap-3 rounded-2xl bg-violet-50 p-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="mt-0.5 h-6 w-6 shrink-0 accent-violet-600"
        />
        <span className="text-sm text-violet-900">
          J’accepte que ma photo soit traitée pour générer un rendu, dans les conditions
          décrites dans la{' '}
          <Link href="/confidentialite" className="underline">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>

      <motion.button
        type="button"
        whileTap={tap}
        disabled={!checked}
        onClick={accept}
        className="btn-primary mt-6 w-full disabled:opacity-50"
      >
        Continuer
      </motion.button>
    </div>
  );
}
