'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '@/components/Logo';
import { track } from '@/lib/analytics';
import { useTapScale } from '@/components/motion';

const MENU = [
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/connexion', label: 'Se connecter' },
] as const;

export default function Header() {
  const [open, setOpen] = useState(false);
  const tap = useTapScale();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-[520px] items-center gap-1.5 px-4 py-3">
        <motion.button
          type="button"
          whileTap={tap}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="-ml-1 grid h-12 w-12 shrink-0 place-items-center rounded-xl"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" stroke="var(--violet-900)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </motion.button>

        <Link
          href="/"
          aria-label="Trycut, accueil"
          className="grid h-12 w-12 shrink-0 place-items-center"
        >
          <Logo size={36} />
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Link href="/connexion" className="btn-outline btn-sm">
            Se connecter
          </Link>
          <Link
            href="/tarifs"
            onClick={() => track('landing_cta_clicked', { location: 'header' })}
            className="btn-primary btn-sm"
          >
            Trouver ma coupe
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-line"
          >
            <ul className="section py-2">
              {MENU.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-[52px] items-center border-b border-line text-base font-medium text-violet-900 last:border-b-0"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
