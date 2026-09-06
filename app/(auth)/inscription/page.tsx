import Link from 'next/link';
import AuthForm from '@/components/AuthForm';
import Footer from '@/components/Footer';
import { signUpAction } from '@/lib/auth-actions';

export const metadata = { title: 'Créer un compte — Trycut' };

export default function SignUpPage() {
  return (
    <>
      <main className="section py-10">
        <h1 className="text-2xl">Garde tes résultats.</h1>
        <p className="mt-3 text-base text-slate-500">
          Crée ton compte et le studio s’ouvre : ta photo, ta coupe, l’aperçu de ce que
          ça donne. L’abonnement se prend au moment de lancer le rendu, sans engagement.
        </p>

        <div className="mt-8">
          <AuthForm mode="signup" action={signUpAction} />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Déjà un compte ?{' '}
          <Link href="/connexion" className="inline-flex min-h-[48px] items-center font-semibold text-violet-600 underline">
            Se connecter
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
