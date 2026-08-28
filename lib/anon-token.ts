import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

/**
 * Jeton d'essai anonyme : httpOnly, signé HMAC.
 * Il autorise exactement une génération gratuite, sans compte (section 7.4).
 */

export const ANON_COOKIE = 'trycut_anon';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function sign(value: string): string {
  return createHmac('sha256', env.anonTokenSecret).update(value).digest('hex');
}

export function createAnonToken(): string {
  const value = randomBytes(16).toString('hex');
  return `${value}.${sign(value)}`;
}

export function verifyAnonToken(token: string | undefined): string | null {
  if (!token) return null;
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const value = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = sign(value);

  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  return value;
}

/** Lit le jeton du cookie et le valide. Retourne le token complet, ou null. */
export async function readAnonToken(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(ANON_COOKIE)?.value;
  return verifyAnonToken(raw) ? (raw ?? null) : null;
}

export const anonCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
} as const;
