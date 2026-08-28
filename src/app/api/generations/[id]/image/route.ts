import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { readGuestId } from '@/lib/guest';
import { decodePath } from '@/lib/storage';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Relais same-origin vers le résultat stocké.
 *
 * Le bucket reste privé et le fichier n'est lu qu'après vérification serveur
 * de la propriété de la ligne. Passer par notre domaine évite au navigateur
 * toute question de CORS au moment de composer l'export 9:16 sur un canvas.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!UUID.test(id)) {
    return NextResponse.json({ message: 'Identifiant invalide.' }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ message: 'Service indisponible.' }, { status: 503 });
  }

  const { data } = await admin
    .from('generations')
    .select('user_id, guest_id, status, result_path')
    .eq('id', id)
    .maybeSingle<{
      user_id: string | null;
      guest_id: string | null;
      status: string;
      result_path: string | null;
    }>();

  if (!data || data.status !== 'succeeded' || !data.result_path) {
    return NextResponse.json({ message: 'Résultat introuvable.' }, { status: 404 });
  }

  const user = await getUser();
  const guestId = await readGuestId();
  const owned = data.user_id ? data.user_id === user?.id : data.guest_id === guestId && !!guestId;

  if (!owned) {
    return NextResponse.json({ message: 'Résultat introuvable.' }, { status: 404 });
  }

  const decoded = decodePath(data.result_path);
  if (!decoded) {
    return NextResponse.json({ message: 'Résultat introuvable.' }, { status: 404 });
  }

  const { data: file, error } = await admin.storage.from(decoded.bucket).download(decoded.path);
  if (error || !file) {
    return NextResponse.json({ message: 'Résultat introuvable.' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(await file.arrayBuffer()), {
    headers: {
      'content-type': file.type || 'image/jpeg',
      // Privé et court : l'image ne doit vivre dans aucun cache partagé.
      'cache-control': 'private, max-age=60',
    },
  });
}
