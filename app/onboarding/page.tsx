import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { env } from '@/lib/env';

export const metadata = { title: 'Ton profil — Trycut' };

export default function OnboardingPage() {
  return <OnboardingFlow variant={env.onboardingLength} recommendedCount={12} />;
}
