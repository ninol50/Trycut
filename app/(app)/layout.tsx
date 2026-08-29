import { redirect } from 'next/navigation';
import Link from 'next/link';
import { loadProfile } from '@/lib/profile';
import { isSupabaseConfigured } from '@/lib/env';
import Footer from '@/components/Footer';
import { signOutAction } from '@/lib/auth-actions';

/**
 * Vérification de session côté serveur, dans un layout server component.
 * Aucun contenu premium n'est rendu côté client avant ce passage.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <main className="section py-16">
        <h1 className="text-2xl">Espace indisponible</h1>
        <p className="mt-3 text-base text-slate-500">
          L’espace personnel est momentanément indisponible. Réessaie dans quelques minutes.
        </p>
      </main>
    );
  }

  const session = await loadProfile();
  if (!session) redirect('/connexion');

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur">
        <div className="section flex items-center justify-between py-3">
          <Link href="/app" className="font-display text-lg font-bold text-violet-900">
            trycut
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-600">
              {session.profile.credits_remaining} coupe
              {session.profile.credits_remaining > 1 ? 's' : ''}
            </span>
            {session.profile.is_admin ? (
              <Link href="/admin" className="text-sm font-semibold text-violet-600 underline">
                Inscrits
              </Link>
            ) : null}
            <Link href="/compte" className="text-sm font-semibold text-violet-600 underline">
              Compte
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="text-sm text-slate-500 underline">
                Quitter
              </button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <Footer />
    </>
  );
}
