import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabase, getSessionUser } from '@/lib/supabase/server';
import { env, isSupabaseConfigured } from '@/lib/env';
import { CAPACITY_MESSAGE } from '@/lib/limits';
import { UPLOAD_BUCKET } from '@/lib/storage';
import { getProvider } from '@/lib/ai/provider';
import { buildPrompt, type PromptContext } from '@/lib/ai/prompt';

export const runtime = 'nodejs';

/**
 * Le client n'envoie QUE `imagePath` et `catalogItemId` — jamais de prompt libre.
 * Tout l'enchaînement sensible (propriété du fichier, rate limit, plafonds,
 * débit du crédit, insertion) se joue dans `start_generation`, une seule
 * transaction Postgres. L'app ne peut pas en contourner une étape.
 */
const bodySchema = z.object({
  imagePath: z.string().min(1).max(400),
  catalogItemId: z.string().uuid(),
  profile: z
    .object({
      texture: z.string().max(40).optional(),
      length: z.string().max(40).optional(),
      beard: z.string().max(40).optional(),
      face: z.string().max(40).optional(),
      hairline: z.string().max(40).optional(),
    })
    .optional(),
});

const ERRORS: Record<string, { status: number; message: string }> = {
  auth: { status: 401, message: 'Connecte-toi pour générer une coupe.' },
  file: { status: 400, message: 'Photo introuvable. Reprends-en une.' },
  quota: {
    status: 402,
    message: 'Il te reste 0 coupe. Prends un abonnement pour générer.',
  },
  capacity: { status: 503, message: CAPACITY_MESSAGE },
  rejected: { status: 403, message: 'Ton compte n’a pas accès au service.' },
  payment: {
    status: 402,
    message: 'Ton dernier paiement a été refusé. Mets ton moyen de paiement à jour.',
  },
};

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: 'indisponible', message: 'Le service n’est pas encore configuré.' },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'file', message: 'Requête invalide.' }, { status: 400 });
  }

  const { imagePath, catalogItemId, profile } = parsed.data;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'auth', message: ERRORS['auth']?.message }, { status: 401 });
  }

  const supabase = await createServerSupabase();

  // --- réservation, débit et insertion, en une transaction ------------------
  // `start_generation` renvoie aussi le gabarit de prompt : la colonne n'est
  // pas lisible par le client, elle ne transite que par cette fonction.
  const { data, error } = await supabase.rpc('start_generation', {
    p_catalog_item_id: catalogItemId,
    p_source_path: imagePath,
  });

  if (error) {
    console.error('[generations] start_generation', error.message);
    return NextResponse.json(
      { error: 'network', message: 'La connexion a été interrompue. Réessaie.' },
      { status: 502 },
    );
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        generation_id: string | null;
        callback_secret: string | null;
        credits_left: number;
        prompt_template: string | null;
        error_code: string | null;
      }
    | undefined;

  if (!row || row.error_code || !row.generation_id || !row.callback_secret || !row.prompt_template) {
    const code = row?.error_code ?? 'network';
    const mapped = ERRORS[code] ?? { status: 502, message: 'La connexion a été interrompue. Réessaie.' };
    return NextResponse.json({ error: code, message: mapped.message }, { status: mapped.status });
  }

  const generationId = row.generation_id;
  const callbackSecret = row.callback_secret;

  // --- appel provider, sans attendre le résultat ---------------------------
  try {
    const { data: signed } = await supabase.storage
      .from(UPLOAD_BUCKET)
      .createSignedUrl(imagePath, 60);
    if (!signed?.signedUrl) throw new Error('URL signée indisponible');

    const context: PromptContext = profile ?? {};
    const { jobId } = await getProvider().generate({
      imageUrl: signed.signedUrl,
      prompt: buildPrompt(row.prompt_template, context),
      generationId,
      callbackSecret,
      sourcePath: imagePath,
      webhookUrl: `${env.siteUrl}/api/webhooks/ai`,
    });

    await supabase
      .from('generations')
      .update({ status: 'processing', provider_job_id: jobId })
      .eq('id', generationId);
  } catch (providerError) {
    console.error('[generations] provider', providerError);
    await supabase.rpc('fail_generation', {
      p_generation_id: generationId,
      p_secret: callbackSecret,
      p_error_code: 'provider',
      p_error_message: 'Le service de rendu n’a pas répondu. Ta coupe t’a été rendue.',
    });
    return NextResponse.json(
      { error: 'network', message: 'La connexion a été interrompue. Réessaie.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ generationId, creditsLeft: row.credits_left });
}
