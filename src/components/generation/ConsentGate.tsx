'use client';

import Link from 'next/link';

export const CONSENT_STORAGE_KEY = 'photo_consent_v1';

/**
 * Écran de consentement avant le premier upload (section 9).
 * Case à cocher explicite, jamais pré-cochée.
 */
export function ConsentGate({
  accepted,
  onChange,
}: {
  accepted: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-white p-5">
      <label className="flex min-h-tap cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-6 w-6 shrink-0 accent-violet-600"
        />
        <span className="text-body-sm text-ink">
          J’accepte que ma photo soit envoyée à notre prestataire d’IA pour être
          traitée, et supprimée automatiquement sous 30 jours.{' '}
          <Link href="/confidentialite" className="font-semibold text-violet-600 underline">
            En savoir plus
          </Link>
        </span>
      </label>
    </div>
  );
}
