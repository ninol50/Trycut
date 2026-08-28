import GenerationWatcher from '@/components/generation/GenerationWatcher';

export const metadata = { title: 'Rendu en cours — Trycut' };

export default async function AppGenerationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <GenerationWatcher
      generationId={id ?? null}
      successBasePath="/app/resultat"
      retryPath="/app"
    />
  );
}
