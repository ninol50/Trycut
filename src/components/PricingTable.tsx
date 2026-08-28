'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, LinkButton } from '@/components/ui/Button';
import { OFFERS } from '@/lib/offers';
import type { OfferId } from '@/lib/offers';
import { capture } from '@/lib/analytics';

/**
 * Trois offres, celle du milieu mise en avant.
 *
 * Le pack à l'usage est l'offre principale : l'usage réel est épisodique, et
 * un abonnement mensuel sur un usage ponctuel produit surtout du churn.
 */
export function PricingTable({ authenticated }: { authenticated: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<OfferId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(offer: Exclude<OfferId, 'free'>): Promise<void> {
    setError(null);

    if (!authenticated) {
      router.push('/connexion?suite=/tarifs');
      return;
    }

    setBusy(offer);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ offer }),
      });

      const payload: unknown = await response.json().catch(() => null);
      const url = readString(payload, 'url');

      if (!response.ok || !url) {
        const redirect = readString(payload, 'redirect');
        if (redirect) {
          router.push(redirect);
          return;
        }
        setError(readString(payload, 'message') ?? 'Le paiement est indisponible. Réessaie.');
        return;
      }

      // `checkout_completed` est émis au retour de Stripe, sur /compte : c'est
      // le seul moment où le paiement est réellement confirmé.
      window.location.href = url;
    } catch {
      setError('La connexion a été interrompue. Réessaie.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {OFFERS.map((offer) => (
        <div
          key={offer.id}
          className={
            offer.highlighted
              ? 'rounded-2xl border-2 border-violet-600 bg-violet-50 p-6 shadow-violet'
              : 'card p-6'
          }
        >
          {offer.highlighted && (
            <p className="mb-3 inline-flex rounded-full bg-violet-600 px-3 py-1 text-body-sm font-semibold text-white">
              Recommandé
            </p>
          )}

          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-display-md">{offer.name}</h2>
            <div className="text-right">
              <p className="text-display-md text-violet-600">{offer.price}</p>
              {offer.cadence && <p className="text-body-sm text-slate-500">{offer.cadence}</p>}
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {offer.features.map((feature) => (
              <li key={feature} className="flex gap-2 text-body text-ink">
                <span className="text-violet-600" aria-hidden="true">
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>

          {offer.footnote && (
            <p className="mt-4 text-body-sm text-slate-500">{offer.footnote}</p>
          )}

          <div className="mt-6">
            {offer.mode === null ? (
              <LinkButton href="/onboarding" variant="secondary" fullWidth>
                Commencer gratuitement
              </LinkButton>
            ) : (
              <Button
                fullWidth
                variant={offer.highlighted ? 'primary' : 'secondary'}
                disabled={busy !== null}
                onClick={() => {
                  capture('landing_cta_clicked', { position: `pricing_${offer.id}` });
                  void checkout(offer.id as Exclude<OfferId, 'free'>);
                }}
              >
                {busy === offer.id ? 'Redirection…' : `Choisir le ${offer.name.toLowerCase()}`}
              </Button>
            )}
          </div>
        </div>
      ))}

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
