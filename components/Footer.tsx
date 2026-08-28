import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="section border-t border-violet-50 py-8 text-sm text-slate-500">
      <nav className="flex flex-wrap gap-x-5">
        {[
          { href: '/confidentialite', label: 'Confidentialité' },
          { href: '/tarifs', label: 'Tarifs' },
          { href: '/connexion', label: 'Connexion' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-[48px] min-w-[48px] items-center underline"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="mt-4">Résultats générés par IA, à titre indicatif.</p>
      <p className="mt-1">© {new Date().getFullYear()} Trycut</p>
    </footer>
  );
}
