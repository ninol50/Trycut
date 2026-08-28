import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { clientIp, ensureGuestId, hashIp } from '@/lib/guest';
import { decodePath, SELFIE_BUCKET, SIGNED_URL_TTL_SECONDS } from '@/lib/storage';
import { getProvider } from '@/lib/ai/provider';
import { buildPrompt } from '@/lib/ai/prompt';
import { START_FAILURE_MESSAGES } from '@/lib/errors';
import { siteUrl, spendLimits } from '@/lib/env';
import type { OnboardingAnswers } from '@/lib/onboarding';
import type { StartGenerationResult } from '@/lib/types/db';

export const runtime = 'nodejs';

/**
 * Le client n'envoie qu'un `catalogItemId` et le chemin de sa photo.
 * Aucun prompt libre, aucun paramètre de modèle, aucun décompte de crédit.
 */
const bodySchema = z.object({
  imagePath: z.string().min(3).max(300),
  catalogItemId: z.string().uuid(),
  // Le profil d'onboarding sert uniquement à interpoler le template serveur.
  answers: z
    .object({
      texture: z.string().max(32).optional(),
      faceShape: z.string().max(32).optional(),
      beard: z.string().max(32).optional(),
      length: z.string().max(32).optional(),
    })
    .optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'file', message: 'Requête invalide.' },
      { status: 400 },
    );
  }

  const { imagePath, catalogItemId, answers } = parsed.data;

  const source = decodePath(imagePath);
  if (!source || source.bucket !== SELFIE_BUCKET) {
    return NextResponse.json(
      { code: 'file', message: 'Photo introuvable. Reprends-en une.' },
      { status: 400 },
    );
  }

  const user = await getUser();
  const guestId = user ? null : await ensureGuestId();

  // Le chemin doit appartenir à l'appelant : sans ce contrôle, n'importe qui
  // pourrait faire générer à partir de la photo d'un autre.
  const expectedPrefix = user ? `${user.id}/` : `guest/${guestId}/`;
  if (!source.path.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { code: 'file', message: 'Photo introuvable. Reprends-en une.' },
      { status: 403 },
    );
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error('[generations] configuration serveur incomplète', error);
    return NextResponse.json(
      { code: 'network', message: 'Service indisponible. Réessaie dans un instant.' },
      { status: 503 },
    );
  }

  // --- Débit atomique + garde-fous, entièrement en base -----------------
  const rpc = user
    ? admin.rpc('start_generation', {
        p_user_id: user.id,
        p_catalog_item_id: catalogItemId,
        p_source_path: imagePath,
        p_daily_cap: spendLimits.dailyGenerationCap,
        p_cost_cents: spendLimits.estimatedCostCentsPerGeneration,
        p_hourly_limit: spendLimits.userHourlyLimit,
      })
    : admin.rpc('start_guest_generation', {
        p_guest_id: guestId,
        p_catalog_item_id: catalogItemId,
        p_source_path: imagePath,
        p_daily_cap: spendLimits.dailyGenerationCap,
        p_cost_cents: spendLimits.estimatedCostCentsPerGeneration,
        p_ip_hash: hashIp(clientIp(request.headers)),
        p_ip_limit: spendLimits.ipFreeLimit,
      });

  const { data: startData, error: startError } = await rpc;

  if (startError) {
    console.error('[generations] start_generation a échoué', startError.message);
    return NextResponse.json(
      { code: 'network', message: 'Service indisponible. Réessaie dans un instant.' },
      { status: 503 },
    );
  }

  const result = startData as StartGenerationResult;

  if (!result.ok || !result.generation_id) {
    const failure = START_FAILURE_MESSAGES[result.reason] ?? {
      status: 400,
      code: 'provider',
      message: 'La génération n’a pas pu démarrer.',
    };
    return NextResponse.json(
      { code: failure.code, message: failure.message, creditsRemaining: result.credits_remaining },
      { status: failure.status },
    );
  }

  const generationId = result.generation_id;

  // --- Appel du fournisseur, sans jamais attendre le résultat ------------
  try {
    const { data: item, error: itemError } = await admin
      .from('catalog_items')
      .select('prompt_template')
      .eq('id', catalogItemId)
      .single<{ prompt_template: string }>();

    if (itemError || !item) throw new Error('article de catalogue introuvable');

    const { data: signed, error: signError } = await admin.storage
      .from(source.bucket)
      .createSignedUrl(source.path, SIGNED_URL_TTL_SECONDS * 5);

    if (signError || !signed) throw new Error('URL signée indisponible');

    const provider = getProvider();
    const { jobId } = await provider.generate({
      generationId,
      sourceImageUrl: signed.signedUrl,
      prompt: buildPrompt(item.prompt_template, (answers ?? {}) as OnboardingAnswers),
      webhookUrl: `${siteUrl()}/api/webhooks/ai`,
    });

    await admin
      .from('generations')
      .update({ status: 'processing', provider_job_id: jobId })
      .eq('id', generationId);
  } catch (error) {
    // Échec de démarrage : on marque `failed`, ce qui rembourse le crédit dans
    // la même transaction Postgres.
    console.error('[generations] démarrage impossible', error);
    await admin.rpc('fail_generation', {
      p_generation_id: generationId,
      p_error_code: 'provider',
      p_error_message: 'Le service de génération est indisponible.',
    });

    return NextResponse.json(
      {
        code: 'provider',
        message: 'La génération a échoué. Ton crédit t’a été rendu, réessaie.',
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    generationId,
    creditsRemaining: result.credits_remaining,
  });
}
