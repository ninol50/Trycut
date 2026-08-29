import Link from 'next/link';
import { redirect } from 'next/navigation';
import PortalButton from '@/components/PortalButton';
import DeleteAccountButton from '@/components/DeleteAccountButton';
import { loadProfile } from '@/lib/profile';
import type { Plan, SubscriptionStatus } from '@/types/db';

export const metadata = { title: 'Mon compte — Trycut' };
export const dynamic = 'force-dynamic';

const PLAN_LABELS: Record<Plan, string> = {
  free: 'Essai',
  pack: 'Pack',
  pass: 'Pass',
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  none: 'Aucun abonnement',
  active: 'Actif',
  past_due: 'Paiement en attente',
  canceled: 'Résilié',
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string }>;
}) {
  const params = await searchParams;
  const session = await loadProfile();
  if (!session) redirect('/connexion');

  const { profile } = session;

  return (
    <div className="section py-10">
      <h1 className="text-2xl">
        {profile.first_name ? `Salut ${profile.first_name}.` : 'Mon compte'}
      </h1>

      {params.paiement === 'ok' ? (
        <p role="status" className="mt-4 rounded-2xl bg-violet-50 p-3 text-sm text-violet-900">
          Paiement confirmé. Tes coupes arrivent dans quelques secondes.
        </p>
      ) : null}

      <dl className="mt-8 space-y-2">
        <Row label="Email" value={session.user.email} />
        <Row label="Offre" value={PLAN_LABELS[profile.plan]} />
        <Row label="Abonnement" value={STATUS_LABELS[profile.subscription_status]} />
        <Row label="Crédits restants" value={String(profile.credits_remaining)} />
        {profile.current_period_end ? (
          <Row
            label="Accès jusqu’au"
            value={new Date(profile.current_period_end).toLocaleDateString('fr-FR')}
          />
        ) : null}
      </dl>

      <div className="mt-8 space-y-3">
        <Link href="/tarifs" className="btn-primary w-full">
          Voir les offres
        </Link>
        <PortalButton />
      </div>

      <div className="mt-10 border-t border-violet-50 pt-6">
        <h2 className="text-xl">Tes données</h2>
        <p className="mt-2 text-sm text-slate-500">
          Photos et résultats sont supprimés automatiquement au bout de 30 jours. Tu peux
          tout effacer maintenant en supprimant ton compte.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Détail du traitement sur la{' '}
          <Link href="/confidentialite" className="text-violet-600 underline">
            page confidentialité
          </Link>
          .
        </p>
        <div className="mt-5">
          <DeleteAccountButton />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-violet-50 px-4 py-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-violet-900">{value}</dd>
    </div>
  );
}
