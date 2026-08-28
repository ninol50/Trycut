import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminSupabase, getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { RESULT_BUCKET, UPLOAD_BUCKET, signedUrl } from '@/lib/storage';
import { ANON_COOKIE, verifyAnonToken } from '@/lib/anon-token';
import type { Generation } from '@/types/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Fallback de polling (2s côté client, timeout 120s).
 * Les lignes anonymes ne sont jamais lisibles par RLS : la propriété est
 * validée ici, contre le jeton signé.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'indisponible' }, { status: 503 });
  }

  const { id } = await params;
  const admin = createAdminSupabase();

  const { data } = await admin.from('generations').select('*').eq('id', id).maybeSingle();
  const generation = data as Generation | null;

  if (!generation) {
    return NextResponse.json({ error: 'introuvable' }, { status: 404 });
  }

  const user = await getSessionUser();
  const store = await cookies();
  const rawToken = store.get(ANON_COOKIE)?.value;

  const ownedByUser = Boolean(user && generation.user_id === user.id);
  const ownedByAnon =
    generation.user_id === null &&
    Boolean(rawToken) &&
    verifyAnonToken(rawToken) !== null &&
    generation.anon_token === rawToken;

  if (!ownedByUser && !ownedByAnon) {
    return NextResponse.json({ error: 'interdit' }, { status: 403 });
  }

  const resultUrl =
    generation.status === 'succeeded' && generation.result_path
      ? await signedUrl(admin, RESULT_BUCKET, generation.result_path)
      : null;

  const sourceUrl = await signedUrl(admin, UPLOAD_BUCKET, generation.source_path);

  return NextResponse.json({
    id: generation.id,
    status: generation.status,
    errorCode: generation.error_code,
    errorMessage: generation.error_message,
    resultUrl,
    sourceUrl,
    /** L'essai anonyme reste en basse résolution et filigrané. */
    watermarked: generation.user_id === null,
  });
}
