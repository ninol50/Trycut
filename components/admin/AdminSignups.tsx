'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTapScale } from '@/components/motion';

export interface Signup {
  id: string;
  email: string;
  first_name: string | null;
  access_status: 'pending' | 'approved' | 'rejected';
  plan: string;
  subscription_status: string;
  credits_remaining: number;
  generations_count: number;
  created_at: string;
}

const STATUS_LABEL: Record<Signup['access_status'], string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
};

const SUBSCRIPTION_LABEL: Record<string, string> = {
  none: 'Aucun abonnement',
  active: 'Abonnement actif',
  past_due: 'Paiement refusé',
  canceled: 'Résilié',
};

export default function AdminSignups({ initial }: { initial: readonly Signup[] }) {
  const tap = useTapScale();
  const [rows, setRows] = useState<Signup[]>([...initial]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setStatus = async (userId: string, status: Signup['access_status']) => {
    setBusyId(userId);
    setError(null);

    const previous = rows;
    setRows((current) =>
      current.map((row) => (row.id === userId ? { ...row, access_status: status } : row)),
    );

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, status }),
      });
      if (!response.ok) {
        setRows(previous);
        setError(
          response.status === 403
            ? 'Ton compte n’est pas administrateur.'
            : 'La mise à jour a échoué. Réessaie.',
        );
      }
    } catch {
      setRows(previous);
      setError('La connexion a été interrompue. Réessaie.');
    } finally {
      setBusyId(null);
    }
  };

  if (rows.length === 0) {
    return (
      <p className="mt-8 rounded-3xl border border-line p-6 text-center text-base text-slate-500">
        Aucun inscrit pour le moment.
      </p>
    );
  }

  const pending = rows.filter((row) => row.access_status === 'pending').length;

  return (
    <>
      {pending > 0 ? (
        <p className="mt-6 inline-flex rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-600">
          {pending} en attente de validation
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 rounded-2xl bg-violet-50 p-3 text-sm text-violet-900">
          {error}
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-3xl border border-line p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-violet-900">
                  {row.first_name ? `${row.first_name} — ` : ''}
                  {row.email}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Inscrit le{' '}
                  {new Date(row.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  row.access_status === 'approved'
                    ? 'bg-violet-600 text-white'
                    : row.access_status === 'rejected'
                      ? 'bg-violet-50 text-slate-500'
                      : 'bg-violet-50 text-violet-600'
                }`}
              >
                {STATUS_LABEL[row.access_status]}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              {SUBSCRIPTION_LABEL[row.subscription_status] ?? row.subscription_status} ·{' '}
              {row.credits_remaining} coupe{row.credits_remaining > 1 ? 's' : ''} ·{' '}
              {row.generations_count} générée{row.generations_count > 1 ? 's' : ''}
            </p>

            <div className="mt-4 flex gap-2">
              <motion.button
                type="button"
                whileTap={tap}
                disabled={busyId === row.id || row.access_status === 'approved'}
                onClick={() => void setStatus(row.id, 'approved')}
                className="btn-primary flex-1 !min-h-[48px] !px-4 text-sm disabled:opacity-40"
              >
                Approuver
              </motion.button>
              <motion.button
                type="button"
                whileTap={tap}
                disabled={busyId === row.id || row.access_status === 'rejected'}
                onClick={() => void setStatus(row.id, 'rejected')}
                className="btn-outline flex-1 !min-h-[48px] !px-4 text-sm disabled:opacity-40"
              >
                Refuser
              </motion.button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
