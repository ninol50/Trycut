import { requirePaidAccess } from '@/lib/paywall';
import ResultScreen from '@/components/generation/ResultScreen';
import Footer from '@/components/Footer';

export const metadata = { title: 'Ton résultat — Trycut' };

export default async function OnboardingResultPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  await requirePaidAccess();

  const { id } = await searchParams;

  return (
    <>
      <main>
        <ResultScreen generationId={id ?? null} retryPath="/onboarding/photo" signupPrompt />
      </main>
      <Footer />
    </>
  );
}
