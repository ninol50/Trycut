'use client';

const CONSENT_KEY = 'trycut_consent_v1';

export function hasStoredConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CONSENT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function storeConsent(value: boolean): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, String(value));
  } catch {
    // navigation privée : le consentement vaut pour cette session
  }
}

interface ConsentNoticeProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

/**
 * Consentement affiché AVANT tout envoi de photo, case jamais pré-cochée.
 * Il vit sur l'écran d'import plutôt que sur un écran dédié : l'obligation
 * légale est tenue sans ajouter une étape au parcours.
 */
export default function ConsentNotice({ checked, onChange }: ConsentNoticeProps) {
  return (
    <label className="flex items-start gap-3 rounded-2xl bg-violet-50 p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-6 w-6 shrink-0 accent-violet-600"
      />
      <span className="text-sm text-slate-500">
        J’accepte que ma photo soit envoyée à un prestataire d’IA pour générer le rendu.
        Elle est stockée dans un espace privé et supprimée sous 30 jours.{' '}
        <a href="/confidentialite" className="text-violet-600 underline">
          En savoir plus
        </a>
      </span>
    </label>
  );
}
