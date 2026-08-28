import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Vérifie ton email', robots: { index: false } };

export default function VerifyEmailPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center bg-white px-5 py-10">
      <h1 className="text-display-lg">Vérifie ta boîte mail</h1>
      <p className="mt-3 text-body text-slate-500">
        On t’a envoyé un lien de confirmation. Clique dessus pour activer ton
        compte : ton essai offert se débloque à ce moment-là.
      </p>
      <p className="mt-6 text-body-sm text-slate-500">
        Rien reçu ? Regarde dans les spams, puis réessaie de te connecter.
      </p>
      <Link
        href="/connexion"
        className="mt-8 inline-flex min-h-tap items-center text-body font-semibold text-violet-600 underline"
      >
        Aller à la connexion
      </Link>
    </main>
  );
}
