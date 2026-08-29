import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { UPLOAD_BUCKET } from '@/lib/storage';
import type { Generation } from '@/types/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLUMNS =
  'id, status, error_code, error_message, result_path, result_bucket, source_path, watermarked';

/**
 * Suivi de la génération. Aucune vérification de propriété en code : la RLS
 * ne renvoie que les lignes de l'appelant. Une ligne qui n'est pas la sienne
 * est simplement introuvable.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'indisponible' }, { status: 503 });
  }

  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data } = await supabase
    .from('generations')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();

  const generation = data as Pick<
    Generation,
    'id' | 'status' | 'error_code' | 'error_message' | 'result_path' | 'source_path'
  > & { result_bucket: string; watermarked: boolean } | null;

  if (!generation) {
    return NextResponse.json({ error: 'introuvable' }, { status: 404 });
  }

  const sign = async (bucket: string, path: string) => {
    const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    return signed?.signedUrl ?? null;
  };

  // Une coupe restée « en cours » trop longtemps ne se débloquera jamais seule :
  // le rappel du fournisseur n'arrivera pas. On la clôt et on rend la coupe.
  // La base refuse d'agir avant le délai, donc ce n'est pas une annulation
  // à la demande.
  if (generation.status === 'queued' || generation.status === 'processing') {
    const { data: expired } = await supabase.rpc('expire_stale_generation', {
      p_generation_id: id,
    });

    if (expired === true) {
      return NextResponse.json({
        id: generation.id,
        status: 'failed',
        errorCode: 'provider',
        errorMessage: 'Le service de rendu n’a pas répondu. Ta coupe t’a été rendue.',
        resultUrl: null,
        sourceUrl: await sign(UPLOAD_BUCKET, generation.source_path),
        watermarked: generation.watermarked,
      });
    }
  }

  const resultUrl =
    generation.status === 'succeeded' && generation.result_path
      ? await sign(generation.result_bucket, generation.result_path)
      : null;

  return NextResponse.json({
    id: generation.id,
    status: generation.status,
    errorCode: generation.error_code,
    errorMessage: generation.error_message,
    resultUrl,
    sourceUrl: await sign(UPLOAD_BUCKET, generation.source_path),
    watermarked: generation.watermarked,
  });
}
