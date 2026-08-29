import { NextResponse, type NextRequest } from 'next/server';
import { createAnonSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { RESULT_BUCKET, UPLOAD_BUCKET } from '@/lib/storage';
import { sendGenerationReadyEmail } from '@/lib/email';

export const runtime = 'nodejs';

/**
 * Rappel du provider. Il n'a pas de session : son droit vient du secret propre
 * à la ligne, généré à la création et jamais exposé au navigateur.
 * Les fonctions `complete_generation` / `fail_generation` sont idempotentes :
 * un doublon ne refait rien, et un échec rembourse la coupe.
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
    generation_id?: string;
    secret?: string;
    status?: string;
    image_url?: string | null;
    source_path?: string | null;
  };

  const url = new URL(request.url);
  const generationId = body.generation_id ?? url.searchParams.get('generation_id');
  const secret = body.secret ?? url.searchParams.get('secret');

  if (!generationId || !secret) {
    return NextResponse.json({ error: 'requete' }, { status: 400 });
  }

  const supabase = createAnonSupabase();
  const failed = body.status === 'failed' || body.status === 'error';

  if (failed) {
    const { data } = await supabase.rpc('fail_generation', {
      p_generation_id: generationId,
      p_secret: secret,
      p_error_code: 'provider',
      p_error_message: 'Le rendu a échoué. Ta coupe t’a été rendue.',
    });
    return data === true
      ? NextResponse.json({ ok: true, refunded: true })
      : NextResponse.json({ error: 'signature' }, { status: 401 });
  }

  // Sans image produite (MockProvider), le résultat pointe sur la photo source :
  // tout le reste du pipeline — URL signée, comparateur, export — reste réel.
  let resultPath: string | null = null;
  let resultBucket = RESULT_BUCKET;

  if (body.image_url) {
    const admin = createAdminSupabase();
    if (!admin) {
      // Rapatrier une image produite demande d'écrire dans le dossier d'un
      // autre utilisateur : c'est le seul point qui exige la clé service_role.
      await supabase.rpc('fail_generation', {
        p_generation_id: generationId,
        p_secret: secret,
        p_error_code: 'provider',
        p_error_message: 'Le stockage du résultat n’est pas configuré.',
      });
      return NextResponse.json({ error: 'service_role_manquante' }, { status: 503 });
    }

    try {
      const { data: row } = await admin
        .from('generations')
        .select('user_id')
        .eq('id', generationId)
        .maybeSingle();

      const owner = (row as { user_id: string | null } | null)?.user_id;
      if (!owner) throw new Error('propriétaire introuvable');

      const response = await fetch(body.image_url);
      if (!response.ok) throw new Error(`téléchargement ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());

      resultPath = `${owner}/${generationId}.jpg`;
      const { error } = await admin.storage
        .from(RESULT_BUCKET)
        .upload(resultPath, bytes, {
          contentType: response.headers.get('content-type') ?? 'image/jpeg',
          upsert: true,
        });
      if (error) throw new Error(error.message);
    } catch (error) {
      console.error('[webhooks/ai]', error);
      await supabase.rpc('fail_generation', {
        p_generation_id: generationId,
        p_secret: secret,
        p_error_code: 'provider',
        p_error_message: 'Le rendu a échoué. Ta coupe t’a été rendue.',
      });
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  } else {
    resultPath = body.source_path ?? null;
    resultBucket = UPLOAD_BUCKET;
    if (!resultPath) {
      return NextResponse.json({ error: 'source_path manquant' }, { status: 400 });
    }
  }

  const { data } = await supabase.rpc('complete_generation', {
    p_generation_id: generationId,
    p_secret: secret,
    p_result_path: resultPath,
    p_result_bucket: resultBucket,
  });

  const result = data as { ok?: boolean; email?: string | null; duplicate?: boolean } | null;
  if (!result?.ok) {
    return NextResponse.json({ error: 'signature' }, { status: 401 });
  }

  // L'email ne doit jamais faire échouer le rappel, ni partir deux fois.
  if (result.email && !result.duplicate) {
    void sendGenerationReadyEmail(result.email, generationId).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
