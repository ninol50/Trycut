import type { AiProvider, GenerateInput, GenerateOutput } from '@/lib/ai/types';
import { requireEnv, optionalEnv } from '@/lib/env';

/**
 * fal.ai — file d'attente asynchrone.
 *
 * On passe par l'API `queue.fal.run` avec `fal_webhook` : la requête rend un
 * `request_id` immédiatement et fal rappelle notre webhook quand l'image est
 * prête. Aucun appel synchrone, conformément à la règle 2 du brief.
 *
 * Le webhook est vérifié côté route : voir `src/app/api/webhooks/ai/route.ts`.
 */
export class FalProvider implements AiProvider {
  readonly name = 'fal';

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const key = requireEnv('FAL_KEY');
    const model = optionalEnv('FAL_MODEL') ?? 'fal-ai/flux/dev/image-to-image';

    const endpoint = new URL(`https://queue.fal.run/${model}`);
    // fal renvoie le corps du webhook à cette URL ; on y ajoute l'identifiant
    // de génération pour corréler sans dépendre du payload du fournisseur.
    const webhook = new URL(input.webhookUrl);
    webhook.searchParams.set('generation_id', input.generationId);
    // fal ne signe pas les rappels : le secret partagé voyage dans l'URL, que
    // seul notre serveur connaît. La route le compare en temps constant.
    webhook.searchParams.set('secret', requireEnv('AI_WEBHOOK_SECRET'));
    endpoint.searchParams.set('fal_webhook', webhook.toString());

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Key ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        prompt: input.prompt,
        image_url: input.sourceImageUrl,
        // Assez fort pour changer la coupe, assez faible pour garder le visage.
        strength: 0.55,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: true,
        output_format: 'jpeg',
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`fal.ai a répondu ${response.status} : ${detail.slice(0, 300)}`);
    }

    const payload: unknown = await response.json();
    const jobId =
      typeof payload === 'object' && payload !== null && 'request_id' in payload
        ? String((payload as { request_id: unknown }).request_id)
        : null;

    if (!jobId) {
      throw new Error("fal.ai n'a pas renvoyé de request_id");
    }

    return { jobId };
  }
}
