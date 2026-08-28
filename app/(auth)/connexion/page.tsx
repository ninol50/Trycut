import Link from 'next/link';
import AuthForm from '@/components/AuthForm';
import Footer from '@/components/Footer';
import { signInAction } from '@/lib/auth-actions';

export const metadata = { title: 'Connexion — Trycut' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <main className="section py-10">
        <h1 className="text-2xl">Content de te revoir.</h1>

        {params.erreur === 'lien' ? (
          <p role="alert" className="mt-4 rounded-2xl bg-violet-50 p-3 text-sm text-violet-900">
            Ce lien de confirmation a expiré. Demande-en un nouveau en te connectant.
          </p>
        ) : null}

        <div className="mt-8">
          <AuthForm mode="signin" action={signInAction} />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Pas encore de compte ?{' '}
          <Link href="/inscription" className="inline-flex min-h-[48px] items-center font-semibold text-violet-600 underline">
            Créer un compte
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
