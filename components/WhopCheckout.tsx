'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTapScale } from '@/components/motion';

/** Chargeur du paiement intégré Whop. */
const LOADER = 'https://js.whop.com/static/checkout/loader.js';

/** Délai avant de considérer que le formulaire ne viendra pas. */
const ATTENTE_MS = 5000;

interface WhopCheckoutProps {
  /** Identifiant du plan Whop, celui du lien de paiement. */
  planId: string;
  /** Lien de paiement complet, servi de repli si l'intégration ne charge pas. */
  href: string;
  label: string;
  onClose: () => void;
}

/**
 * Paiement Whop affiché dans une fenêtre du site, plutôt que sur leur domaine.
 *
 * L'intégration est chargée depuis chez eux et peut ne pas aboutir — script
 * bloqué, identifiant refusé, format changé. Un formulaire de paiement muet
 * étant la pire panne possible, le lien vers la page Whop reste visible en
 * permanence : au pire le client y va comme avant, au mieux il ne quitte
 * jamais le site.
 */
export default function WhopCheckout({ planId, href, label, onClose }: WhopCheckoutProps) {
  const tap = useTapScale();
  const zone = useRef<HTMLDivElement>(null);
  const [charge, setCharge] = useState(false);
  const [tarde, setTarde] = useState(false);

  useEffect(() => {
    // Le chargeur ne doit être injecté qu'une fois, même après plusieurs
    // ouvertures de la fenêtre.
    if (!document.querySelector(`script[src="${LOADER}"]`)) {
      const script = document.createElement('script');
      script.src = LOADER;
      script.async = true;
      document.head.appendChild(script);
    }

    const observer = new MutationObserver(() => {
      if (zone.current?.querySelector('iframe')) setCharge(true);
    });
    if (zone.current) observer.observe(zone.current, { childList: true, subtree: true });

    const minuteur = setTimeout(() => setTarde(true), ATTENTE_MS);
    return () => {
      observer.disconnect();
      clearTimeout(minuteur);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Paiement — ${label}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-marine-900/40 p-0 sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-3xl border border-line bg-white sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="font-display text-lg font-bold text-marine-900">{label}</p>
          <motion.button
            type="button"
            whileTap={tap}
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-12 w-12 place-items-center rounded-xl"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              stroke="var(--marine-900)"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </motion.button>
        </div>

        <div className="p-5">
          {/* Jamais d'écran blanc : un message tient la place avant le
              formulaire, comme pour les quatre états du reste du site. */}
          {!charge ? (
            <p className="mb-4 rounded-2xl bg-marine-50 p-3 text-sm text-marine-900">
              {tarde
                ? 'Le paiement sécurisé ne s’affiche pas ici. Utilise le lien ci-dessous, il fonctionne.'
                : 'Chargement du paiement sécurisé…'}
            </p>
          ) : null}

          <div ref={zone} data-whop-checkout-plan-id={planId} data-whop-checkout-theme="light" />

          <a
            href={href}
            className={`${charge ? 'btn-outline' : 'btn-primary'} mt-5 w-full`}
          >
            {charge ? 'Ouvrir la page de paiement' : 'Payer sur la page sécurisée'}
          </a>

          <p className="mt-3 text-xs text-slate-500">
            Paiement traité par Whop. Utilise de préférence l’adresse email de ton compte
            Trycut : c’est elle qui rattache le paiement à tes coupes.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
