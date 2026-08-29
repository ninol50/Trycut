import Link from 'next/link';
import Logo from '@/components/Logo';

const LEGAL = [
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/connexion', label: 'Se connecter' },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="section py-10">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="font-display text-lg font-bold text-violet-900">trycut</span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Légal</p>
            <ul className="mt-2">
              {LEGAL.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-[48px] min-w-[48px] items-center text-base text-violet-900"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Contact</p>
            <p className="mt-2 break-all text-base text-violet-900">contact@trycut.fr</p>
          </div>
        </div>

        <p className="mt-8 text-sm text-slate-500">
          Résultats générés par IA, à titre indicatif.
        </p>
        <p className="mt-1 text-sm text-slate-500">© {new Date().getFullYear()} Trycut</p>
      </div>
    </footer>
  );
}
