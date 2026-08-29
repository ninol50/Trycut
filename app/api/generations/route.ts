import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createAdminSupabase, getSessionUser } from '@/lib/supabase/server';
import { env, isSupabaseConfigured } from '@/lib/env';
import {
  CAPACITY_MESSAGE,
  anonTrialAvailable,
  checkIpRate,
  checkUserRate,
  clientIpFrom,
  releaseSpend,
  reserveSpend,
} from '@/lib/limits';
import { UPLOAD_BUCKET, signedUrl } from '@/lib/storage';
import { getProvider } from '@/lib/ai/provider';
import { buildPrompt, type PromptContext } from '@/lib/ai/prompt';
import { ANON_COOKIE, verifyAnonToken } from '@/lib/anon-token';
import type { CatalogItem } from '@/types/db';

export const runtime = 'nodejs';

/**
 * Le client n'envoie QUE `imagePath` et `catalogItemId` — jamais de prompt libre.
 * Ordre imposé (section 7.1) : session → plafonds → débit atomique → insert
 * → appel provider → réponse immédiate. Aucune attente du résultat.
 */
const bodySchema = z.object({
  imagePath: z.string().min(1).max(400),
  catalogItemId: z.string().min(1).max(80),
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

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: 'indisponible', message: 'Le service n’est pas encore configuré.' },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'file', message: 'Requête invalide.' },
      { status: 400 },
    );
  }

  const { imagePath, catalogItemId, profile } = parsed.data;
  const admin = createAdminSupabase();
  const user = await getSessionUser();
  const ip = clientIpFrom(request.headers);

  // --- jeton d'essai anonyme ------------------------------------------------
  let anonToken: string | null = null;
  if (!user) {
    // L'offre gratuite donne 0 coupe : sans compte payant, on ne génère pas.
    if (!env.enableFreeTrial) {
      return NextResponse.json(
        {
          error: 'quota',
          message: 'Il te faut un abonnement pour générer une coupe.',
        },
        { status: 402 },
      );
    }

    const store = await cookies();
    const raw = store.get(ANON_COOKIE)?.value;
    if (!verifyAnonToken(raw) || !raw) {
      return NextResponse.json(
        { error: 'quota', message: 'Il te reste 0 crédit.' },
        { status: 402 },
      );
    }
    anonToken = raw;

    if (!(await anonTrialAvailable(admin, anonToken))) {
      return NextResponse.json(
        { error: 'quota', message: 'Il te reste 0 crédit.' },
        { status: 402 },
      );
    }
    if (!(await checkIpRate(admin, ip))) {
      return NextResponse.json(
        { error: 'quota', message: 'Il te reste 0 crédit.' },
        { status: 402 },
      );
    }
  } else if (!(await checkUserRate(admin, user.id))) {
    return NextResponse.json(
      { error: 'capacity', message: CAPACITY_MESSAGE },
      { status: 503 },
    );
  }

  // --- propriété du fichier source -----------------------------------------
  const expectedPrefix = user ? `${user.id}/` : `anon/${anonToken}/`;
  if (!imagePath.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { error: 'file', message: 'Photo introuvable. Reprends-en une.' },
      { status: 403 },
    );
  }

  // --- catalogue ------------------------------------------------------------
  const { data: itemRow } = await admin
    .from('catalog_items')
    .select('*')
    .eq('id', catalogItemId)
    .maybeSingle();

  const item = itemRow as CatalogItem | null;
  if (!item) {
    return NextResponse.json(
      { error: 'file', message: 'Ce style n’existe plus.' },
      { status: 404 },
    );
  }

  // --- plafonds AVANT tout débit -------------------------------------------
  const spend = await reserveSpend(admin);
  if (!spend.ok) {
    return NextResponse.json(
      { error: 'capacity', message: CAPACITY_MESSAGE, reason: spend.reason },
      { status: 503 },
    );
  }

  // --- débit atomique -------------------------------------------------------
  if (user) {
    const { data: remaining, error: creditError } = await admin.rpc('consume_credit', {
      p_user_id: user.id,
      p_generation_id: null,
    });

    if (creditError || typeof remaining !== 'number' || remaining < 0) {
      await releaseSpend(admin);
      return NextResponse.json(
        { error: 'quota', message: 'Il te reste 0 crédit.' },
        { status: 402 },
      );
    }
  }

  // --- ligne de génération --------------------------------------------------
  const { data: created, error: insertError } = await admin
    .from('generations')
    .insert({
      user_id: user?.id ?? null,
      anon_token: anonToken,
      catalog_item_id: item.id,
      source_path: imagePath,
      status: 'queued',
      credits_cost: user ? 1 : 0,
      client_ip: ip,
    })
    .select('id')
    .single();

  if (insertError || !created) {
    await releaseSpend(admin);
    if (user) await admin.rpc('refund_credit', { p_user_id: user.id, p_generation_id: null });
    return NextResponse.json(
      { error: 'network', message: 'La connexion a été interrompue. Réessaie.' },
      { status: 502 },
    );
  }

  const generationId = (created as { id: string }).id;

  // Rattache le débit à la génération pour rendre le remboursement traçable.
  if (user) {
    await admin
      .from('credit_ledger')
      .update({ generation_id: generationId })
      .eq('user_id', user.id)
      .eq('reason', 'generation')
      .is('generation_id', null);
  }

  // --- appel provider (asynchrone, pas d'attente du résultat) ---------------
  try {
    const sourceUrl = await signedUrl(admin, UPLOAD_BUCKET, imagePath);
    if (!sourceUrl) throw new Error('URL signée indisponible');

    const context: PromptContext = profile ?? {};
    const provider = getProvider();
    const { jobId } = await provider.generate({
      imageUrl: sourceUrl,
      prompt: buildPrompt(item, context),
      generationId,
      webhookUrl: `${env.siteUrl}/api/webhooks/ai`,
    });

    await admin
      .from('generations')
      .update({ status: 'processing', provider_job_id: jobId })
      .eq('id', generationId);
  } catch (providerError) {
    console.error('[generations] provider', providerError);
    await admin
      .from('generations')
      .update({
        status: 'failed',
        error_code: 'provider',
        error_message: 'Le service de rendu n’a pas répondu.',
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    await releaseSpend(admin);
    if (user) {
      await admin.rpc('refund_credit', { p_user_id: user.id, p_generation_id: generationId });
    }

    return NextResponse.json(
      { error: 'network', message: 'La connexion a été interrompue. Réessaie.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ generationId });
}
