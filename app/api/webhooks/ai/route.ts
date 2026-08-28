import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';
import { env, isSupabaseConfigured } from '@/lib/env';
import { RESULT_BUCKET, UPLOAD_BUCKET } from '@/lib/storage';
import { releaseSpend } from '@/lib/limits';
import { verifyWebhookToken } from '@/lib/anon-token';
import type { Generation } from '@/types/db';

export const runtime = 'nodejs';

/**
 * Rappel du provider. Idempotent : `webhook_events.external_id` est unique,
 * les webhooks arrivent en double systématiquement.
 * En cas d'échec, le crédit est remboursé (section 7.1).
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'indisponible' }, { status: 503 });
  }

  const payload: unknown = await request.json().catch(() => null);
  if (typeof payload !== 'object' || payload === null) {
    return NextResponse.json({ error: 'payload' }, { status: 400 });
  }

  const body = payload as {
    event_id?: string;
    job_id?: string;
    generation_id?: string;
    status?: string;
    image_url?: string | null;
    error?: string | null;
  };

  const url = new URL(request.url);
  const generationId = body.generation_id ?? url.searchParams.get('generation_id');
  if (!generationId) {
    return NextResponse.json({ error: 'generation_id manquant' }, { status: 400 });
  }

  // Deux formes d'authentification : l'en-tête partagé (MockProvider, providers
  // qui acceptent des en-têtes personnalisés) ou le jeton signé passé dans
  // l'URL de rappel (fal.ai, qui ne relaie pas nos en-têtes).
  const headerOk = request.headers.get('x-ai-signature') === env.aiWebhookSecret;
  const tokenOk = verifyWebhookToken(generationId, url.searchParams.get('token'));
  if (!headerOk && !tokenOk) {
    return NextResponse.json({ error: 'signature' }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const externalId = body.event_id ?? body.job_id ?? `${generationId}-${body.status ?? 'unknown'}`;

  // Idempotence : un doublon sort en 200 sans rien refaire.
  const { error: dedupeError } = await admin
    .from('webhook_events')
    .insert({ provider: 'ai', external_id: externalId, payload: body });

  if (dedupeError) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const { data } = await admin
    .from('generations')
    .select('*')
    .eq('id', generationId)
    .maybeSingle();

  const generation = data as Generation | null;
  if (!generation) {
    return NextResponse.json({ error: 'introuvable' }, { status: 404 });
  }
  if (generation.status === 'succeeded' || generation.status === 'failed') {
    return NextResponse.json({ ok: true, alreadyFinal: true });
  }

  const failed = body.status === 'failed' || body.status === 'error';

  if (failed) {
    await admin
      .from('generations')
      .update({
        status: 'failed',
        error_code: 'provider',
        error_message: 'Le rendu a échoué. Ton crédit t’a été rendu.',
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    await releaseSpend(admin);
    if (generation.user_id) {
      await admin.rpc('refund_credit', {
        p_user_id: generation.user_id,
        p_generation_id: generationId,
      });
    }
    return NextResponse.json({ ok: true, refunded: Boolean(generation.user_id) });
  }

  // --- succès : on rapatrie l'image dans le bucket privé --------------------
  const resultPath = `${generation.user_id ?? `anon/${generation.anon_token}`}/${generationId}.jpg`;

  try {
    let bytes: Uint8Array;
    let contentType = 'image/jpeg';

    if (body.image_url) {
      const response = await fetch(body.image_url);
      if (!response.ok) throw new Error(`téléchargement ${response.status}`);
      bytes = new Uint8Array(await response.arrayBuffer());
      contentType = response.headers.get('content-type') ?? 'image/jpeg';
    } else {
      // MockProvider : pas d'image générée, on réutilise la photo source
      // pour que tout le pipeline (stockage, URL signée, export) reste réel.
      const { data: source, error: downloadError } = await admin.storage
        .from(UPLOAD_BUCKET)
        .download(generation.source_path);
      if (downloadError || !source) throw new Error('source illisible');
      bytes = new Uint8Array(await source.arrayBuffer());
      contentType = source.type || 'image/jpeg';
    }

    const { error: uploadError } = await admin.storage
      .from(RESULT_BUCKET)
      .upload(resultPath, bytes, { contentType, upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    await admin
      .from('generations')
      .update({
        status: 'succeeded',
        result_path: resultPath,
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[webhooks/ai]', error);

    await admin
      .from('generations')
      .update({
        status: 'failed',
        error_code: 'provider',
        error_message: 'Le rendu a échoué. Ton crédit t’a été rendu.',
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    await releaseSpend(admin);
    if (generation.user_id) {
      await admin.rpc('refund_credit', {
        p_user_id: generation.user_id,
        p_generation_id: generationId,
      });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
