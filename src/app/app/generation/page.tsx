import type { Metadata } from 'next';
import { GenerationRunner } from '@/components/generation/GenerationRunner';

export const metadata: Metadata = { title: 'Génération en cours', robots: { index: false } };

export default function AppGenerationPage() {
  // Le layout parent a déjà validé la session : Realtime est disponible.
  return <GenerationRunner authenticated photoHref="/app" resultHref="/app/resultat" />;
}
