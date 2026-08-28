import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isSupabaseConfigured, env } from '@/lib/env';

/** Rafraîchit la session Supabase à chaque requête. La protection des routes
 *  se fait dans les layouts server components, jamais ici seulement. */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|demo/|.*\\.(?:svg|png|jpg|jpeg|webp|mp4|webm)$).*)'],
};
