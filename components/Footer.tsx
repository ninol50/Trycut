import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="section border-t border-violet-50 py-8 text-sm text-slate-500">
      <nav className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href="/confidentialite" className="underline">
          Confidentialité
        </Link>
        <Link href="/tarifs" className="underline">
          Tarifs
        </Link>
        <Link href="/connexion" className="underline">
          Connexion
        </Link>
      </nav>
      <p className="mt-4">Résultats générés par IA, à titre indicatif.</p>
      <p className="mt-1">© {new Date().getFullYear()} Trycut</p>
    </footer>
  );
}
