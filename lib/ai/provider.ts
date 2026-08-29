import { env } from '@/lib/env';
import { buildFalEndpoint } from '@/lib/ai/callback';

export interface GenerateInput {
  /** URL signée de la photo source, lisible par le provider. */
  imageUrl: string;
  /** Prompt construit côté serveur à partir du `prompt_template`. */
  prompt: string;
  /** Identifiant de notre ligne `generations` — renvoyé tel quel par le webhook. */
  generationId: string;
  /** Secret propre à cette ligne : c'est lui qui autorise le rappel. */
  callbackSecret: string;
  /** Chemin de la photo source, réutilisé par le mock comme résultat. */
  sourcePath: string;
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
        secret: input.callbackSecret,
        status: 'succeeded',
        // Le mock n'invente pas d'image : le résultat pointe sur la photo source.
        image_url: null,
        source_path: input.sourcePath,
      }),
    });
  } catch {
    // Le polling client passera en timeout et proposera un nouvel essai.
  }
}

// ------------------------------------------------------------------- fal
/** Modèle d'édition d'image : il garde le visage et ne change que la coupe. */
const FAL_MODEL = 'fal-ai/flux-pro/kontext';

/**
 * FalProvider : stub prêt à brancher. Actif dès que `AI_PROVIDER=fal`
 * et que `FAL_KEY` est renseignée.
 */
export const falProvider: AiProvider = {
  name: 'fal',
  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const key = env.falKey;
    if (!key) throw new Error('FAL_KEY manquante alors que AI_PROVIDER=fal');

    const response = await fetch(
      buildFalEndpoint(FAL_MODEL, input.webhookUrl, input.generationId, input.callbackSecret),
      {
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
        }),
      },
    );

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
