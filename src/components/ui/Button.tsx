'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTap } from '@/lib/motion';

type Variant = 'primary' | 'secondary';

interface CommonProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  fullWidth?: boolean;
}

interface ButtonProps extends CommonProps {
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

interface LinkButtonProps extends CommonProps {
  href: string;
  onClick?: () => void;
}

function classes(variant: Variant, fullWidth: boolean, extra?: string): string {
  const base = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return [base, fullWidth ? 'w-full' : '', extra ?? ''].filter(Boolean).join(' ');
}

const MotionLink = motion.create(Link);

export function Button({
  children,
  variant = 'primary',
  className,
  fullWidth = false,
  onClick,
  type = 'button',
  disabled = false,
}: ButtonProps) {
  const tap = useTap();
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : tap}
      className={classes(variant, fullWidth, `${className ?? ''} disabled:opacity-50`)}
    >
      {children}
    </motion.button>
  );
}

export function LinkButton({
  children,
  href,
  variant = 'primary',
  className,
  fullWidth = false,
  onClick,
}: LinkButtonProps) {
  const tap = useTap();
  return (
    <MotionLink href={href} onClick={onClick} whileTap={tap} className={classes(variant, fullWidth, className)}>
      {children}
    </MotionLink>
  );
}
