import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Connexion' };

export default function LoginPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-white px-5 py-10">
      <Link href="/" className="text-body-sm font-semibold text-violet-600">
        ← Accueil
      </Link>
      <h1 className="mt-6 text-display-lg">Content de te revoir</h1>
      <div className="mt-8">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
