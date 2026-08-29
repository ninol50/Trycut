import { redirect } from 'next/navigation';
import AdminSignups, { type Signup } from '@/components/admin/AdminSignups';
import { createServerSupabase } from '@/lib/supabase/server';
import { loadProfile } from '@/lib/profile';

export const metadata = { title: 'Inscrits — Trycut' };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await loadProfile();
  if (!session) redirect('/connexion');

  // La liste est refusée par la base à quiconque n'est pas administrateur ;
  // on évite en plus d'afficher la page.
  if (!session.profile.is_admin) redirect('/app');

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('admin_list_signups');

  const signups = (data as Signup[] | null) ?? [];

  return (
    <div className="section py-10">
      <h1 className="text-2xl">Inscrits</h1>
      <p className="mt-2 text-base text-slate-500">
        Un compte ne peut générer aucune coupe tant qu’il n’est pas approuvé.
      </p>

      {error ? (
        <p role="alert" className="mt-6 rounded-2xl bg-violet-50 p-4 text-sm text-violet-900">
          La liste n’a pas pu être chargée. {error.message}
        </p>
      ) : (
        <AdminSignups initial={signups} />
      )}
    </div>
  );
}
