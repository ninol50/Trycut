'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { capture } from '@/lib/analytics';
import { ONBOARDING_STORAGE_KEY, parseAnswers } from '@/lib/onboarding';
import type { OnboardingAnswers } from '@/lib/onboarding';

export function SignupForm() {
  const router = useRouter();
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Les réponses du questionnaire sont persistées en base à ce moment précis :
  // c'est la première fois qu'un compte existe pour les rattacher.
  useEffect(() => {
    const stored = parseAnswers(window.localStorage.getItem(ONBOARDING_STORAGE_KEY));
    setAnswers(stored);
    if (stored.firstName) setFirstName(stored.firstName);
  }, []);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    if (!ageConfirmed) {
      setError('Il faut avoir 15 ans ou plus pour créer un compte.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          firstName: firstName.trim(),
          ageConfirmed: true,
          answers,
        }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(readString(payload, 'message') ?? 'La création du compte a échoué. Réessaie.');
        return;
      }

      capture('signup_completed', { has_onboarding: Object.keys(answers).length > 0 });

      const sessionReady =
        typeof payload === 'object' &&
        payload !== null &&
        (payload as { sessionReady?: unknown }).sessionReady === true;

      router.push(sessionReady ? '/app' : '/verifie-ton-email');
      router.refresh();
    } catch {
      setError('La connexion a été interrompue. Réessaie.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field
        id="first-name"
        label="Prénom"
        type="text"
        autoComplete="given-name"
        value={firstName}
        onChange={setFirstName}
        maxLength={24}
        required
      />
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        required
      />
      <Field
        id="password"
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        hint="8 caractères minimum."
        required
      />

      <label className="flex min-h-tap cursor-pointer items-start gap-3 pt-1">
        <input
          type="checkbox"
          checked={ageConfirmed}
          onChange={(event) => setAgeConfirmed(event.target.checked)}
          className="mt-1 h-6 w-6 shrink-0 accent-violet-600"
        />
        <span className="text-body-sm text-ink">
          Je déclare avoir 15 ans ou plus et j’accepte la{' '}
          <Link href="/confidentialite" className="font-semibold text-violet-600 underline">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-2xl bg-violet-50 px-4 py-3 text-body-sm text-violet-900">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={busy}>
        {busy ? 'Création…' : 'Créer mon compte'}
      </Button>

      <p className="text-center text-body-sm text-slate-500">
        Déjà un compte ?{' '}
        <Link href="/connexion" className="font-semibold text-violet-600 underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  hint?: string;
  maxLength?: number;
  required?: boolean;
}

export function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  hint,
  maxLength,
  required,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-body-sm font-semibold text-violet-900">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-tap w-full rounded-2xl border-2 border-violet-200 px-4 text-body text-ink
                   placeholder:text-slate-500 focus:border-violet-600 focus:outline-none"
      />
      {hint && <p className="mt-1 text-body-sm text-slate-500">{hint}</p>}
    </div>
  );
}

function readString(payload: unknown, key: string): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}
