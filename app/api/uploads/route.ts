import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase, getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_MESSAGES,
  extensionFor,
  isAcceptedMime,
  sniffImageMime,
} from '@/lib/upload';
import { UPLOAD_BUCKET } from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * Upload de la photo source, avec la session de l'utilisateur : la policy
 * Storage n'autorise l'écriture que dans son propre dossier.
 * Le type MIME est vérifié par la signature binaire, pas par le Content-Type.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: 'indisponible', message: 'Le stockage n’est pas configuré.' },
      { status: 503 },
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: 'auth', message: 'Connecte-toi pour importer une photo.' },
      { status: 401 },
    );
  }

  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File) || file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'file', message: UPLOAD_MESSAGES.file }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageMime(bytes);

  if (!sniffed || !isAcceptedMime(sniffed)) {
    return NextResponse.json({ error: 'file', message: UPLOAD_MESSAGES.file }, { status: 400 });
  }

  const path = `${user.id}/${crypto.randomUUID()}.${extensionFor(sniffed)}`;
  const supabase = await createServerSupabase();

  const { error } = await supabase.storage
    .from(UPLOAD_BUCKET)
    .upload(path, bytes, { contentType: sniffed, upsert: false });

  if (error) {
    console.error('[uploads]', error.message);
    return NextResponse.json(
      { error: 'network', message: 'La connexion a été interrompue. Réessaie.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ imagePath: path });
}
