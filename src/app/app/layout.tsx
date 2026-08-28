import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/supabase/server';
import { AppHeader } from '@/components/AppHeader';

/**
 * Toute route protégée vérifie la session côté serveur, dans un layout server
 * component. Aucun contenu premium n'est rendu côté client avant ça.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();
  if (!session) redirect('/connexion?suite=/app');

  return (
    <div className="min-h-dvh bg-white">
      <AppHeader
        credits={session.profile.credits_remaining}
        plan={session.profile.plan}
        firstName={session.profile.first_name}
      />
      {children}
    </div>
  );
}
