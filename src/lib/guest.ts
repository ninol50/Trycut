import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { requireEnv, optionalEnv } from '@/lib/env';

export const GUEST_COOKIE = 'trycut_guest';

/**
 * Identité du visiteur pendant l'onboarding, avant toute création de compte.
 *
 * C'est un uuid signé HMAC déposé en cookie httpOnly : le visiteur ne peut ni
 * le forger ni s'en fabriquer un deuxième pour rejouer l'essai offert. À
 * l'inscription, `claim_guest_generations` rattache ses essais à son profil.
 */

function secret(): string {
  return optionalEnv('AI_WEBHOOK_SECRET') ?? optionalEnv('CRON_SECRET') ?? 'dev-secret';
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('hex');
}

function serialize(id: string): string {
  return `${id}.${sign(id)}`;
}

export function parseGuestCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;

  const id = raw.slice(0, dot);
  const provided = raw.slice(dot + 1);
  const expected = sign(id);

  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return null;

  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

/** Lit l'identité invité existante, sans en créer. */
export async function readGuestId(): Promise<string | null> {
  const store = await cookies();
  return parseGuestCookie(store.get(GUEST_COOKIE)?.value);
}

/** Lit l'identité invité, ou en crée une et pose le cookie. */
export async function ensureGuestId(): Promise<string> {
  const store = await cookies();
  const existing = parseGuestCookie(store.get(GUEST_COOKIE)?.value);
  if (existing) return existing;

  const id = randomUUID();
  store.set(GUEST_COOKIE, serialize(id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}

export async function clearGuestId(): Promise<void> {
  const store = await cookies();
  store.delete(GUEST_COOKIE);
}

/**
 * Empreinte d'IP pour la limite de 3 essais gratuits / 24 h.
 * On ne stocke jamais l'IP en clair : seul un hash salé est conservé.
 */
export function hashIp(ip: string): string {
  const salt = optionalEnv('CRON_SECRET') ?? optionalEnv('AI_WEBHOOK_SECRET') ?? 'dev-secret';
  return createHmac('sha256', salt).update(ip).digest('hex');
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || headers.get('x-real-ip') || '0.0.0.0';
}

/** Utilisé par les routes qui exigent une configuration complète. */
export function assertServerSecrets(): void {
  requireEnv('SUPABASE_SERVICE_ROLE_KEY');
}
