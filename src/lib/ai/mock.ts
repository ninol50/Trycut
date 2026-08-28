import { createHmac } from 'node:crypto';
import { after } from 'next/server';
import type { AiProvider, GenerateInput, GenerateOutput } from '@/lib/ai/types';
import { optionalEnv } from '@/lib/env';

/**
 * Fournisseur de démonstration.
 *
 * Il reproduit le contrat réel de bout en bout : il rend la main tout de suite
 * et rappelle le webhook 4 s plus tard, exactement comme fal.ai. C'est ce qui
 * permet de parcourir l'intégralité du produit sans un euro d'API.
 *
 * Le renvoi de l'image : le webhook reçoit `resultUrl` pointant sur la route
 * `/api/mock-image/[generationId]`, qui sert une image de démonstration. Le
 * pipeline de téléchargement/stockage est donc exercé pour de vrai.
 */
export class MockProvider implements AiProvider {
  readonly name = 'mock';

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const jobId = `mock_${input.generationId}`;
    const secret = optionalEnv('AI_WEBHOOK_SECRET') ?? 'dev-secret';

    const body = JSON.stringify({
      jobId,
      generationId: input.generationId,
      status: 'succeeded',
      resultUrl: new URL(
        `/api/mock-image/${input.generationId}`,
        input.webhookUrl,
      ).toString(),
    });

    const signature = createHmac('sha256', secret).update(body).digest('hex');

    // `after` laisse la route répondre immédiatement tout en gardant la
    // fonction vivante le temps du rappel : sans lui, l'environnement
    // serverless gèlerait le `setTimeout` dès la réponse envoyée.
    after(async () => {
      await scheduleCallback(input.webhookUrl, body, signature);
    });

    return { jobId };
  }
}

async function scheduleCallback(
  webhookUrl: string,
  body: string,
  signature: string,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 4000));
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-ai-signature': signature },
      body,
    });
  } catch (error) {
    console.error('[mock-provider] callback échoué', error);
  }
}
