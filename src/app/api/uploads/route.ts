import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureGuestId } from '@/lib/guest';
import { encodePath, SELFIE_BUCKET, selfieObjectPath } from '@/lib/storage';
import { MAX_UPLOAD_BYTES, extensionFor, sniffMime } from '@/lib/image';

export const runtime = 'nodejs';

/**
 * Réception du selfie.
 *
 * Le type MIME est déterminé à partir des octets du fichier, pas du
 * `Content-Type` déclaré ni de l'extension : les deux sont fournis par le
 * client. Le fichier atterrit dans un bucket privé ; seule une URL signée
 * 60 s permettra ensuite d'y accéder.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { code: 'file', message: 'Fichier illisible. Réessaie.' },
      { status: 400 },
    );
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { code: 'file', message: 'Aucun fichier reçu.' },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        code: 'file',
        message: 'Format non supporté. Utilise un JPG ou un PNG de moins de 10 Mo.',
      },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime) {
    return NextResponse.json(
      {
        code: 'file',
        message: 'Format non supporté. Utilise un JPG ou un PNG de moins de 10 Mo.',
      },
      { status: 415 },
    );
  }

  // Utilisateur connecté → son propre dossier. Visiteur → dossier invité,
  // rattaché à son compte à l'inscription.
  const user = await getUser();
  const owner = user ? user.id : `guest/${await ensureGuestId()}`;

  const objectPath = selfieObjectPath(owner, randomUUID(), extensionFor(mime));

  try {
    const admin = createAdminClient();
    const { error } = await admin.storage
      .from(SELFIE_BUCKET)
      .upload(objectPath, bytes, { contentType: mime, upsert: false });

    if (error) {
      console.error('[uploads] échec du stockage', error.message);
      return NextResponse.json(
        { code: 'network', message: 'L’envoi a échoué. Réessaie.' },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error('[uploads] configuration serveur incomplète', error);
    return NextResponse.json(
      { code: 'network', message: 'Service indisponible. Réessaie dans un instant.' },
      { status: 503 },
    );
  }

  return NextResponse.json({ storagePath: encodePath(SELFIE_BUCKET, objectPath) });
}
