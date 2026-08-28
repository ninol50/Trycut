import type { Metadata } from 'next';
import Link from 'next/link';
import { SignupForm } from '@/components/auth/SignupForm';

export const metadata: Metadata = { title: 'Créer un compte' };

export default function SignupPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-white px-5 py-10">
      <Link href="/" className="text-body-sm font-semibold text-violet-600">
        ← Accueil
      </Link>
      <h1 className="mt-6 text-display-lg">Crée ton compte</h1>
      <p className="mt-2 text-body text-slate-500">
        Pour retrouver tes essais et débloquer ton crédit offert après vérification
        de ton adresse.
      </p>
      <div className="mt-8">
        <SignupForm />
      </div>
    </main>
  );
}
