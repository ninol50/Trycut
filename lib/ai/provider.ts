import { env } from '@/lib/env';

export interface GenerateInput {
  /** URL signée de la photo source, lisible par le provider. */
  imageUrl: string;
  /** Prompt construit côté serveur à partir du `prompt_template`. */
  prompt: string;
  /** Identifiant de notre ligne `generations` — renvoyé tel quel par le webhook. */
  generationId: string;
  /** URL de rappel. */
  webhookUrl: string;
}

export interface GenerateOutput {
  jobId: string;
}

export interface AiProvider {
  readonly name: string;
  generate(input: GenerateInput): Promise<GenerateOutput>;
}

export function getProvider(): AiProvider {
  return env.aiProvider === 'fal' ? falProvider : mockProvider;
}

// ------------------------------------------------------------------ mock
/**
 * MockProvider : permet de parcourir tout le produit sans un euro d'API.
 * Il rappelle notre propre webhook après 4 s, exactement comme le ferait
 * un vrai provider asynchrone.
 */
export const mockProvider: AiProvider = {
  name: 'mock',
  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const jobId = `mock_${input.generationId}`;

    void scheduleMockCallback(input, jobId);

    return { jobId };
  },
};

async function scheduleMockCallback(input: GenerateInput, jobId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 4000));
  try {
    await fetch(input.webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-ai-signature': env.aiWebhookSecret,
      },
      body: JSON.stringify({
        event_id: `${jobId}_done`,
        job_id: jobId,
        generation_id: input.generationId,
        status: 'succeeded',
        // Le mock n'invente pas d'image : le webhook réutilise la photo source.
        image_url: null,
      }),
    });
  } catch {
    // Le polling client passera en timeout et proposera un nouvel essai.
  }
}

// ------------------------------------------------------------------- fal
/**
 * FalProvider : stub prêt à brancher. Actif dès que `AI_PROVIDER=fal`
 * et que `FAL_KEY` est renseignée.
 */
export const falProvider: AiProvider = {
  name: 'fal',
  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const key = env.falKey;
    if (!key) throw new Error('FAL_KEY manquante alors que AI_PROVIDER=fal');

    const response = await fetch('https://queue.fal.run/fal-ai/flux-pro/kontext', {
      method: 'POST',
      headers: {
        authorization: `Key ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        prompt: input.prompt,
        image_url: input.imageUrl,
        num_images: 1,
        output_format: 'jpeg',
        fal_webhook: `${input.webhookUrl}?generation_id=${input.generationId}`,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`fal.ai a répondu ${response.status} : ${detail.slice(0, 200)}`);
    }

    const payload: unknown = await response.json();
    const jobId =
      typeof payload === 'object' && payload !== null && 'request_id' in payload
        ? String((payload as { request_id: unknown }).request_id)
        : `fal_${input.generationId}`;

    return { jobId };
  },
};
