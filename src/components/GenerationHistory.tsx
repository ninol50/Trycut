import Link from 'next/link';
import type { CatalogItemView } from '@/lib/catalog';

export interface HistoryEntry {
  id: string;
  label: string;
  status: string;
  createdAt: string;
}

/**
 * Historique des essais.
 * Les vignettes passent par le relais same-origin, qui revérifie la propriété
 * de chaque ligne avant de signer l'accès au stockage.
 */
export function GenerationHistory({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-5 text-body-sm text-slate-500">
        Tes essais apparaîtront ici.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-3">
      {entries.map((entry) => (
        <li key={entry.id}>
          {entry.status === 'succeeded' ? (
            <Link href={`/api/generations/${entry.id}/image`} target="_blank" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/generations/${entry.id}/image`}
                alt={entry.label}
                width={200}
                height={250}
                loading="lazy"
                className="aspect-[4/5] w-full rounded-2xl border border-violet-200 object-cover"
              />
            </Link>
          ) : (
            <div className="media-placeholder aspect-[4/5] w-full text-body-sm">
              {entry.status === 'failed' ? 'échec' : '…'}
            </div>
          )}
          <p className="mt-1 truncate text-body-sm text-slate-500">{entry.label}</p>
        </li>
      ))}
    </ul>
  );
}

export function labelForCatalogItem(
  catalog: CatalogItemView[],
  catalogItemId: string,
): string {
  return catalog.find((item) => item.id === catalogItemId)?.label ?? 'Essai';
}
