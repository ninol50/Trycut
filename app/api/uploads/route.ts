import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminSupabase, getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_MESSAGES,
  extensionFor,
  isAcceptedMime,
  sniffImageMime,
} from '@/lib/upload';
import { UPLOAD_BUCKET, ownerPrefix } from '@/lib/storage';
import {
  ANON_COOKIE,
  anonCookieOptions,
  createAnonToken,
  verifyAnonToken,
} from '@/lib/anon-token';

export const runtime = 'nodejs';

/**
 * Upload de la photo source. Le type MIME est vérifié côté serveur
 * par la signature binaire, pas par le Content-Type déclaré.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: 'storage_indisponible', message: 'Le stockage n’est pas configuré.' },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File) || file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: 'file', message: UPLOAD_MESSAGES.file },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageMime(bytes);

  if (!sniffed || !isAcceptedMime(sniffed)) {
    return NextResponse.json(
      { error: 'file', message: UPLOAD_MESSAGES.file },
      { status: 400 },
    );
  }

  const user = await getSessionUser();

  // Un visiteur sans compte reçoit un jeton d'essai signé httpOnly.
  const store = await cookies();
  const existing = store.get(ANON_COOKIE)?.value;
  let anonToken: string | null = null;

  if (!user) {
    anonToken = verifyAnonToken(existing) ? (existing ?? null) : createAnonToken();
  }

  const prefix = ownerPrefix(user?.id ?? null, anonToken);
  const path = `${prefix}/${crypto.randomUUID()}.${extensionFor(sniffed)}`;

  const admin = createAdminSupabase();
  const { error } = await admin.storage
    .from(UPLOAD_BUCKET)
    .upload(path, bytes, { contentType: sniffed, upsert: false });

  if (error) {
    console.error('[uploads]', error.message);
    return NextResponse.json(
      { error: 'network', message: 'La connexion a été interrompue. Réessaie.' },
      { status: 502 },
    );
  }

  const response = NextResponse.json({ imagePath: path });
  if (anonToken && anonToken !== existing) {
    response.cookies.set(ANON_COOKIE, anonToken, anonCookieOptions);
  }
  return response;
}
