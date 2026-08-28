import GenerationWatcher from '@/components/generation/GenerationWatcher';

export const metadata = { title: 'Rendu en cours — Trycut' };

export default async function OnboardingGenerationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <main>
      <GenerationWatcher
        generationId={id ?? null}
        successBasePath="/onboarding/resultat"
        retryPath="/onboarding/photo"
      />
    </main>
  );
}
