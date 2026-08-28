import Link from 'next/link';
import type { Generation } from '@/types/db';

const STATUS_LABELS: Record<Generation['status'], string> = {
  queued: 'En file',
  processing: 'En cours',
  succeeded: 'Prêt',
  failed: 'Échoué',
};

/** Historique. Les images passent par une URL signée générée à l'ouverture. */
export default function HistoryStrip({ items }: { items: readonly Generation[] }) {
  if (items.length === 0) return null;

  return (
    <section className="section pb-12">
      <h2 className="text-xl">Tes essais</h2>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/app/resultat?id=${item.id}`}
              className="flex items-center justify-between rounded-2xl border border-violet-50 bg-white p-4 shadow-violet"
            >
              <span className="text-sm text-slate-500">
                {new Date(item.created_at).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span
                className={`text-sm font-semibold ${
                  item.status === 'succeeded' ? 'text-violet-600' : 'text-slate-500'
                }`}
              >
                {STATUS_LABELS[item.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
