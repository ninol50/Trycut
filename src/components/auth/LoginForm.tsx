'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/auth/SignupForm';
import { createClient } from '@/lib/supabase/client';

const ERREURS: Record<string, string> = {
  lien_invalide: 'Ce lien de confirmation est invalide. Reconnecte-toi pour en recevoir un autre.',
  lien_expire: 'Ce lien de confirmation a expiré. Reconnecte-toi pour en recevoir un autre.',
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    ERREURS[searchParams.get('erreur') ?? ''] ?? null,
  );

  const suite = searchParams.get('suite') ?? '/app';

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(
          signInError.message.toLowerCase().includes('email not confirmed')
            ? 'Ton adresse n’est pas encore confirmée. Vérifie ta boîte mail.'
            : 'Email ou mot de passe incorrect.',
        );
        return;
      }

      router.push(suite.startsWith('/') ? suite : '/app');
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
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        required
      />

      {error && (
        <p role="alert" className="rounded-2xl bg-violet-50 px-4 py-3 text-body-sm text-violet-900">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={busy}>
        {busy ? 'Connexion…' : 'Se connecter'}
      </Button>

      <p className="text-center text-body-sm text-slate-500">
        Pas encore de compte ?{' '}
        <Link href="/inscription" className="font-semibold text-violet-600 underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
