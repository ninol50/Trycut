import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Sans configuration Supabase, on laisse simplement passer : l'app doit
  // rester démarrable avant que le `.env.local` soit rempli.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Tout sauf les assets statiques, les images et les webhooks — ces
     * derniers n'ont pas de session à rafraîchir et sont authentifiés
     * par signature.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
