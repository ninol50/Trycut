import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/supabase/server';
import { loadCatalog } from '@/lib/catalog-server';
import { PhotoStep } from '@/components/generation/PhotoStep';
import { GenerationHistory, labelForCatalogItem } from '@/components/GenerationHistory';
import type { HistoryEntry } from '@/components/GenerationHistory';
import type { Generation } from '@/lib/types/db';

export const metadata: Metadata = { title: 'Mes essais', robots: { index: false } };

export default async function AppPage() {
  const session = await getSessionContext();
  if (!session) redirect('/connexion?suite=/app');

  const catalog = await loadCatalog();

  const { data: rows } = await session.supabase
    .from('generations')
    .select('id, catalog_item_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(12)
    .returns<Pick<Generation, 'id' | 'catalog_item_id' | 'status' | 'created_at'>[]>();

  const entries: HistoryEntry[] = (rows ?? []).map((row) => ({
    id: row.id,
    label: labelForCatalogItem(catalog, row.catalog_item_id),
    status: row.status,
    createdAt: row.created_at,
  }));

  const outOfCredits = session.profile.credits_remaining <= 0;

  return (
    <>
      {outOfCredits && (
        <div className="mx-auto w-full max-w-md px-5 pt-5">
          <div className="rounded-2xl border-2 border-violet-600 bg-violet-50 p-4">
            <p className="text-body font-semibold text-violet-900">Il te reste 0 crédit.</p>
            <Link
              href="/tarifs"
              className="mt-2 inline-flex min-h-tap items-center text-body-sm font-semibold text-violet-600 underline"
            >
              Recharger avec un pack
            </Link>
          </div>
        </div>
      )}

      <PhotoStep
        catalog={catalog}
        premiumUnlocked={session.profile.plan === 'pass'}
        nextHref="/app/generation"
      >
        <section className="mt-10">
          <h2 className="mb-4 text-display-md">Tes essais</h2>
          <GenerationHistory entries={entries} />
        </section>
      </PhotoStep>
    </>
  );
}
