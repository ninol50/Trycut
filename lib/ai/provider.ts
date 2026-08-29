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
  /** Photos de référence des styles demandés. Vide si aucune n'est déposée. */
  referenceUrls?: readonly string[];
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
 * Variante multi-images, utilisée dès qu'une photo de référence accompagne la
 * demande. Si elle n'est pas disponible, on retombe sur le modèle simple : une
 * référence absente dégrade la fidélité, elle ne doit pas casser le rendu.
 */
const FAL_MODEL_MULTI = 'fal-ai/flux-pro/kontext/max/multi';

/**
 * FalProvider : stub prêt à brancher. Actif dès que `AI_PROVIDER=fal`
 * et que `FAL_KEY` est renseignée.
 */
export const falProvider: AiProvider = {
  name: 'fal',
  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const key = env.falKey;
    if (!key) throw new Error('FAL_KEY manquante alors que AI_PROVIDER=fal');

    const references = input.referenceUrls ?? [];

    const common = {
      prompt: input.prompt,
      num_images: 1,
      output_format: 'jpeg',
      // Par défaut le modèle s'autorise à réinterpréter largement la photo.
      // Une adhérence plus forte le tient à la consigne et au visage
      // d'origine ; au-delà, le rendu se fige et devient artificiel.
      guidance_scale: 4.5,
    };

    const submit = async (model: string, body: unknown) =>
      fetch(buildFalEndpoint(model, input.webhookUrl, input.generationId, input.callbackSecret), {
        method: 'POST',
        headers: {
          authorization: `Key ${key}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });

    let response =
      references.length > 0
        ? await submit(FAL_MODEL_MULTI, {
            ...common,
            image_urls: [input.imageUrl, ...references],
          })
        : await submit(FAL_MODEL, { ...common, image_url: input.imageUrl });

    // Une référence est un bonus, jamais une condition : si la variante
    // multi-images refuse la demande, on refait le rendu sans elle plutôt que
    // de rendre une coupe impossible à générer.
    if (!response.ok && references.length > 0) {
      const detail = await response.text();
      console.error('[fal] variante multi-images indisponible', response.status, detail.slice(0, 200));
      response = await submit(FAL_MODEL, { ...common, image_url: input.imageUrl });
    }

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
