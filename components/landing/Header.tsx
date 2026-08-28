'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CtaButton from '@/components/CtaButton';

/** Header minimal, sticky après 80px de scroll. Aucun menu sur mobile. */
export default function Header() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-white/90 backdrop-blur transition-shadow ${
        stuck ? 'shadow-violet' : ''
      }`}
    >
      <div className="section flex items-center justify-between py-3">
        <Link
          href="/"
          className="inline-flex min-h-[48px] items-center font-display text-lg font-bold text-violet-900"
        >
          trycut
        </Link>
        <CtaButton location="header" size="compact">
          Tester ma coupe
        </CtaButton>
      </div>
    </header>
  );
}
