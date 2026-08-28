import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { readGuestId } from '@/lib/guest';
import type { Generation } from '@/lib/types/db';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Repli de polling (toutes les 2 s côté client) et source unique des URL
 * signées : la propriété de la ligne est vérifiée avant toute signature.
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

  const { data, error } = await admin
    .from('generations')
    .select('id, user_id, guest_id, status, result_path, watermarked, error_code, error_message')
    .eq('id', id)
    .maybeSingle<
      Pick<
        Generation,
        'id' | 'user_id' | 'status' | 'result_path' | 'watermarked' | 'error_code' | 'error_message'
      > & { guest_id: string | null }
    >();

  if (error || !data) {
    return NextResponse.json({ message: 'Génération introuvable.' }, { status: 404 });
  }

  // Contrôle de propriété — la clé service_role contourne le RLS, c'est donc
  // ici que la vérification doit être faite.
  const user = await getUser();
  const guestId = await readGuestId();
  const owned = data.user_id ? data.user_id === user?.id : data.guest_id === guestId && !!guestId;

  if (!owned) {
    return NextResponse.json({ message: 'Génération introuvable.' }, { status: 404 });
  }

  // Le client reçoit un relais same-origin, jamais l'URL de stockage : celle-ci
  // est signée à la volée dans `/image`, après le même contrôle de propriété.
  const resultUrl =
    data.status === 'succeeded' && data.result_path ? `/api/generations/${id}/image` : null;

  return NextResponse.json(
    {
      status: data.status,
      resultUrl,
      watermarked: data.watermarked,
      errorCode: data.error_code,
      errorMessage: data.error_message,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
