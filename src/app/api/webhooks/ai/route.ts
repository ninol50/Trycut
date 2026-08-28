import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { encodePath, GENERATION_BUCKET, generationObjectPath } from '@/lib/storage';
import { optionalEnv } from '@/lib/env';
import type { Generation } from '@/lib/types/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Webhook du fournisseur IA.
 *
 * Trois garanties tenues ici :
 *  - authentification (signature HMAC pour le mock, clé partagée pour fal) ;
 *  - idempotence via `webhook_events.external_id` — les webhooks arrivent en
 *    double, systématiquement ;
 *  - en cas d'échec, `fail_generation` rembourse le crédit dans la même
 *    transaction.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const raw = await request.text();

  if (!verifySignature(raw, request)) {
    return NextResponse.json({ message: 'Signature invalide.' }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = parsePayload(raw, new URL(request.url));
  } catch {
    return NextResponse.json({ message: 'Charge utile invalide.' }, { status: 400 });
  }

  if (!payload.generationId) {
    return NextResponse.json({ message: 'Génération inconnue.' }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ message: 'Service indisponible.' }, { status: 503 });
  }

  // Idempotence : la contrainte unique fait foi, pas une lecture préalable.
  const externalId = payload.jobId ?? payload.generationId;
  const { error: dedupeError } = await admin
    .from('webhook_events')
    .insert({ provider: 'ai', external_id: externalId, payload: safeJson(raw) });

  if (dedupeError) {
    // 23505 = violation de contrainte unique : l'événement a déjà été traité.
    if (dedupeError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('[webhook:ai] journalisation impossible', dedupeError.message);
  }

  const { data: generation } = await admin
    .from('generations')
    .select('id, user_id, guest_id, status')
    .eq('id', payload.generationId)
    .maybeSingle<Pick<Generation, 'id' | 'user_id' | 'status'> & { guest_id: string | null }>();

  if (!generation) {
    return NextResponse.json({ message: 'Génération introuvable.' }, { status: 404 });
  }

  if (payload.status === 'failed' || !payload.resultUrl) {
    await admin.rpc('fail_generation', {
      p_generation_id: payload.generationId,
      p_error_code: payload.errorCode ?? 'provider',
      p_error_message:
        payload.errorMessage ?? 'La génération a échoué. Ton crédit t’a été rendu, réessaie.',
    });
    return NextResponse.json({ received: true });
  }

  // Téléchargement puis stockage dans le bucket privé.
  try {
    const response = await fetch(payload.resultUrl);
    if (!response.ok) throw new Error(`téléchargement ${response.status}`);

    const bytes = new Uint8Array(await response.arrayBuffer());
    const owner = generation.user_id ?? `guest/${generation.guest_id}`;
    const objectPath = generationObjectPath(owner, generation.id);

    const { error: uploadError } = await admin.storage
      .from(GENERATION_BUCKET)
      .upload(objectPath, bytes, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    await admin.rpc('complete_generation', {
      p_generation_id: payload.generationId,
      p_result_path: encodePath(GENERATION_BUCKET, objectPath),
    });
  } catch (error) {
    console.error('[webhook:ai] récupération du résultat impossible', error);
    await admin.rpc('fail_generation', {
      p_generation_id: payload.generationId,
      p_error_code: 'provider',
      p_error_message: 'Le résultat n’a pas pu être récupéré. Ton crédit t’a été rendu.',
    });
  }

  return NextResponse.json({ received: true });
}

interface WebhookPayload {
  generationId: string | null;
  jobId: string | null;
  status: 'succeeded' | 'failed';
  resultUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

/**
 * Deux formes de charge utile : celle du mock (plate, explicite) et celle de
 * fal.ai (`status: 'OK' | 'ERROR'`, images sous `payload.images[]`).
 */
function parsePayload(raw: string, url: URL): WebhookPayload {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) throw new Error('payload');
  const source = parsed as Record<string, unknown>;

  // Le mock corrèle par `generationId`, fal par le paramètre d'URL posé à
  // l'appel : dans les deux cas, on ne dépend pas d'un identifiant deviné.
  const generationId =
    typeof source['generationId'] === 'string'
      ? source['generationId']
      : url.searchParams.get('generation_id');

  const jobId =
    typeof source['jobId'] === 'string'
      ? source['jobId']
      : typeof source['request_id'] === 'string'
        ? source['request_id']
        : null;

  const falStatus = typeof source['status'] === 'string' ? source['status'] : null;
  const failed = falStatus === 'ERROR' || falStatus === 'failed';

  return {
    generationId,
    jobId,
    status: failed ? 'failed' : 'succeeded',
    resultUrl: extractResultUrl(source),
    errorCode: typeof source['errorCode'] === 'string' ? source['errorCode'] : null,
    errorMessage: typeof source['error'] === 'string' ? source['error'] : null,
  };
}

function extractResultUrl(source: Record<string, unknown>): string | null {
  if (typeof source['resultUrl'] === 'string') return source['resultUrl'];

  const inner = source['payload'];
  if (typeof inner !== 'object' || inner === null) return null;

  const images = (inner as { images?: unknown }).images;
  if (!Array.isArray(images) || images.length === 0) return null;

  const first = images[0];
  if (typeof first !== 'object' || first === null) return null;

  const url = (first as { url?: unknown }).url;
  return typeof url === 'string' ? url : null;
}

function verifySignature(raw: string, request: Request): boolean {
  const secret = optionalEnv('AI_WEBHOOK_SECRET') ?? 'dev-secret';

  const hmac = request.headers.get('x-ai-signature');
  if (hmac) {
    const expected = createHmac('sha256', secret).update(raw).digest('hex');
    if (hmac.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  }

  // fal.ai ne signe pas ses rappels : le secret partagé a été placé dans
  // l'URL de webhook au moment de l'appel (voir FalProvider).
  const shared = new URL(request.url).searchParams.get('secret');
  if (shared && shared.length === secret.length) {
    return timingSafeEqual(Buffer.from(shared), Buffer.from(secret));
  }

  return false;
}

function safeJson(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
