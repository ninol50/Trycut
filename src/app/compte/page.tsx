import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/supabase/server';
import { AccountActions } from '@/components/account/AccountActions';

export const metadata: Metadata = { title: 'Mon compte', robots: { index: false } };

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratuit',
  pass: 'Pass mensuel',
};

const STATUS_LABELS: Record<string, string> = {
  none: 'Aucun abonnement',
  active: 'Actif',
  past_due: 'Paiement en retard',
  canceled: 'Résilié',
};

export default async function AccountPage() {
  const session = await getSessionContext();
  if (!session) redirect('/connexion?suite=/compte');

  const { profile } = session;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-white px-5 py-10">
      <Link href="/app" className="text-body-sm font-semibold text-violet-600">
        ← Mes essais
      </Link>

      <h1 className="mt-6 text-display-lg">Mon compte</h1>

      <dl className="mt-8 space-y-3">
        <Row label="Prénom" value={profile.first_name ?? '—'} />
        <Row label="Email" value={profile.email} />
        <Row label="Formule" value={PLAN_LABELS[profile.plan] ?? profile.plan} />
        <Row
          label="Abonnement"
          value={STATUS_LABELS[profile.subscription_status] ?? profile.subscription_status}
        />
        <Row label="Crédits restants" value={String(profile.credits_remaining)} />
        {profile.current_period_end && (
          <Row
            label="Renouvellement"
            value={new Date(profile.current_period_end).toLocaleDateString('fr-FR')}
          />
        )}
      </dl>

      {profile.credits_remaining === 0 && (
        <Link
          href="/tarifs"
          className="mt-6 inline-flex min-h-tap items-center text-body font-semibold text-violet-600 underline"
        >
          Recharger mes crédits
        </Link>
      )}

      <div className="mt-10">
        <Suspense fallback={null}>
          <AccountActions hasStripeCustomer={profile.stripe_customer_id !== null} />
        </Suspense>
      </div>

      <section className="mt-10 rounded-2xl bg-violet-50 p-5">
        <h2 className="text-display-md">Tes photos</h2>
        <p className="mt-2 text-body-sm text-slate-500">
          Tes photos sources et tes résultats sont supprimés automatiquement 30
          jours après leur création. Tu peux tout effacer immédiatement en
          supprimant ton compte.{' '}
          <Link href="/confidentialite" className="font-semibold text-violet-600 underline">
            Détail du traitement
          </Link>
        </p>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-violet-200 pb-3">
      <dt className="text-body-sm text-slate-500">{label}</dt>
      <dd className="text-body font-semibold text-violet-900">{value}</dd>
    </div>
  );
}
