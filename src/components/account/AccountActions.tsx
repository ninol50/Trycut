'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { capture } from '@/lib/analytics';

export function AccountActions({ hasStripeCustomer }: { hasStripeCustomer: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState<'portal' | 'logout' | 'delete' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Retour de Stripe Checkout : c'est ici que le paiement est confirmé côté
  // utilisateur, donc ici que l'event part.
  useEffect(() => {
    if (searchParams.get('paiement') === 'ok') {
      capture('checkout_completed');
    }
  }, [searchParams]);

  async function openPortal(): Promise<void> {
    setError(null);
    setBusy('portal');
    try {
      const response = await fetch('/api/portal', { method: 'POST' });
      const payload: unknown = await response.json().catch(() => null);
      const url = readString(payload, 'url');

      if (!response.ok || !url) {
        setError(readString(payload, 'message') ?? 'Le portail est indisponible. Réessaie.');
        return;
      }
      window.location.href = url;
    } catch {
      setError('La connexion a été interrompue. Réessaie.');
    } finally {
      setBusy(null);
    }
  }

  async function logout(): Promise<void> {
    setBusy('logout');
    await createClient().auth.signOut();
    router.push('/');
    router.refresh();
  }

  async function remove(): Promise<void> {
    setError(null);
    setBusy('delete');
    try {
      const response = await fetch('/api/account/delete', { method: 'POST' });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        setError(readString(payload, 'message') ?? 'La suppression a échoué. Réessaie.');
        return;
      }
      await createClient().auth.signOut();
      router.push('/');
      router.refresh();
    } catch {
      setError('La connexion a été interrompue. Réessaie.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        {hasStripeCustomer && (
          <Button
            variant="secondary"
            fullWidth
            disabled={busy !== null}
            onClick={() => void openPortal()}
          >
            {busy === 'portal' ? 'Ouverture…' : 'Gérer mon abonnement et mes factures'}
          </Button>
        )}
        <Button variant="secondary" fullWidth disabled={busy !== null} onClick={() => void logout()}>
          Se déconnecter
        </Button>
      </div>

      <section className="rounded-2xl border border-violet-200 p-5">
        <h2 className="text-display-md">Supprimer mon compte</h2>
        <p className="mt-2 text-body-sm text-slate-500">
          Ton profil, tes essais et toutes tes photos sont effacés
          définitivement. Cette action est irréversible.
        </p>

        {confirmDelete ? (
          <div className="mt-4 space-y-3">
            <p className="text-body-sm font-semibold text-violet-900">
              Confirmer la suppression définitive ?
            </p>
            <Button fullWidth disabled={busy !== null} onClick={() => void remove()}>
              {busy === 'delete' ? 'Suppression…' : 'Oui, tout supprimer'}
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            fullWidth
            className="mt-4"
            onClick={() => setConfirmDelete(true)}
          >
            Supprimer mon compte
          </Button>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-2xl bg-violet-50 px-4 py-3 text-body-sm text-violet-900">
          {error}
        </p>
      )}
    </div>
  );
}

function readString(payload: unknown, key: string): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}
