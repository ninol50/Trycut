import { redirect } from 'next/navigation';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { env } from '@/lib/env';

export const metadata = { title: 'Ton profil — Trycut' };

export default function OnboardingPage() {
  // Parcours par défaut : aucune question. On importe la photo, on choisit
  // une coupe, c'est tout. Le questionnaire reste servi sous NEXT_PUBLIC_ONBOARDING_LENGTH.
  if (env.onboardingLength === 'none') redirect('/onboarding/photo');

  return <OnboardingFlow variant={env.onboardingLength} recommendedCount={12} />;
}
