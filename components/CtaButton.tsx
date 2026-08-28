'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { track } from '@/lib/analytics';
import { useTapScale } from '@/components/motion';

interface CtaButtonProps {
  children: React.ReactNode;
  location: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'inverse';
  fullWidth?: boolean;
}

const MotionLink = motion.create(Link);

export default function CtaButton({
  children,
  location,
  href = '/onboarding',
  variant = 'primary',
  fullWidth = false,
}: CtaButtonProps) {
  const tap = useTapScale();

  const className =
    variant === 'inverse'
      ? 'inline-flex min-h-[52px] items-center justify-center rounded-full bg-white px-6 py-4 text-base font-semibold text-violet-600'
      : variant === 'secondary'
        ? 'btn-secondary'
        : 'btn-primary';

  return (
    <MotionLink
      href={href}
      whileTap={tap}
      onClick={() => track('landing_cta_clicked', { location, href })}
      className={`${className}${fullWidth ? ' w-full' : ''}`}
    >
      {children}
    </MotionLink>
  );
}
