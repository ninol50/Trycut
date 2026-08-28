import type { AiProvider } from '@/lib/ai/types';
import { MockProvider } from '@/lib/ai/mock';
import { FalProvider } from '@/lib/ai/fal';
import { AI_PROVIDER } from '@/lib/env';

let cached: AiProvider | null = null;

/**
 * Point d'entrée unique du fournisseur IA.
 * Bascule mock → réel par la seule variable `AI_PROVIDER`.
 */
export function getProvider(): AiProvider {
  if (cached) return cached;
  cached = AI_PROVIDER === 'fal' ? new FalProvider() : new MockProvider();
  return cached;
}

export type { AiProvider, GenerateInput, GenerateOutput } from '@/lib/ai/types';
