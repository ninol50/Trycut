import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { loadProfile } from '@/lib/profile';
import { accorderDepuisWhop } from '@/lib/whop-reconcile';

export const runtime = 'nodejs';

/**
 * « J'ai payé, ouvre-moi l'accès. »
 *
 * Demandé par le client lui-même, pour son propre compte : l'identifiant vient
 * de la session, jamais du corps de la requête. Personne ne peut donc débloquer
 * le compte d'un autre, et la seule chose qui décide reste la réponse de Whop.
 */
export async function POST() {
  if (!isSupabaseConfigured) return NextResponse.json({ etat: 'indisponible' }, { status: 503 });

  const session = await loadProfile();
  if (!session) return NextResponse.json({ etat: 'indisponible' }, { status: 401 });

  const etat = await accorderDepuisWhop(session.user.id, [
    session.user.email,
    session.profile.email,
    session.profile.billing_email,
  ]);

  return NextResponse.json({ etat });
}
