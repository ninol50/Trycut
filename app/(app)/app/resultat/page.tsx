import { requirePaidAccess } from '@/lib/paywall';
import ResultScreen from '@/components/generation/ResultScreen';

export const metadata = { title: 'Ton résultat — Trycut' };

export default async function AppResultPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  await requirePaidAccess();

  const { id } = await searchParams;
  return <ResultScreen generationId={id ?? null} retryPath="/app" />;
}
