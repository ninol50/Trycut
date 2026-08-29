'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { AuthFormState } from '@/lib/auth-actions';
import { track } from '@/lib/analytics';
import { useTapScale } from '@/components/motion';

interface AuthFormProps {
  mode: 'signup' | 'signin';
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  defaultFirstName?: string;
}

const INITIAL: AuthFormState = { error: null, notice: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const tap = useTapScale();

  return (
    <motion.button
      type="submit"
      disabled={pending}
      whileTap={tap}
      className="btn-primary w-full disabled:opacity-60"
    >
      {pending ? 'Un instant…' : label}
    </motion.button>
  );
}

const REMEMBERED_EMAIL = 'trycut_email';

export default function AuthForm({ mode, action, defaultFirstName }: AuthFormProps) {
  const [state, formAction] = useActionState(action, INITIAL);
  const [email, setEmail] = useState('');
  const isSignup = mode === 'signup';

  // L'email est repropose au retour ; le mot de passe est laisse au
  // gestionnaire du navigateur, qui est fait pour ca.
  useEffect(() => {
    try {
      setEmail(window.localStorage.getItem(REMEMBERED_EMAIL) ?? '');
    } catch {
      // navigation privee
    }
  }, []);

  useEffect(() => {
    if (isSignup && state.notice) track('signup_completed', { method: 'email' });
  }, [isSignup, state.notice]);

  return (
    <form action={formAction} className="space-y-4">
      {isSignup ? (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-violet-900">Prénom</span>
          <input
            name="first_name"
            type="text"
            autoComplete="given-name"
            defaultValue={defaultFirstName}
            className="w-full rounded-2xl border border-violet-200 px-4 py-3 text-base"
          />
        </label>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-violet-900">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            try {
              window.localStorage.setItem(REMEMBERED_EMAIL, event.target.value);
            } catch {
              // navigation privee
            }
          }}
          className="w-full rounded-2xl border border-violet-200 px-4 py-3 text-base"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-violet-900">Mot de passe</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          className="w-full rounded-2xl border border-violet-200 px-4 py-3 text-base"
        />
        {isSignup ? (
          <span className="mt-1 block text-xs text-slate-500">8 caractères minimum.</span>
        ) : null}
      </label>

      {isSignup ? (
        <label className="flex items-start gap-3 rounded-2xl bg-violet-50 p-4">
          {/* Case jamais pré-cochée. */}
          <input
            name="age_confirmed"
            type="checkbox"
            className="mt-0.5 h-6 w-6 shrink-0 accent-violet-600"
          />
          <span className="text-sm text-slate-500">
            Je déclare avoir 15 ans ou plus et j’accepte la{' '}
            <Link href="/confidentialite" className="text-violet-600 underline">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
      ) : null}

      {state.error ? (
        <p role="alert" className="rounded-2xl bg-violet-50 p-3 text-sm text-violet-900">
          {state.error}
        </p>
      ) : null}

      {state.notice ? (
        <p role="status" className="rounded-2xl bg-violet-50 p-3 text-sm text-violet-900">
          {state.notice}
        </p>
      ) : null}

      <SubmitButton label={isSignup ? 'Créer mon compte' : 'Me connecter'} />
    </form>
  );
}
