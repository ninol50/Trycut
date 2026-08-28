import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * Plafonds (section 7.4). Vérifiés AVANT tout débit de crédit :
 * un refus ne doit jamais coûter un crédit à l'utilisateur.
 */

export type LimitFailure =
  | { ok: false; kind: 'capacity'; reason: 'daily_cap' | 'monthly_cap' }
  | { ok: false; kind: 'rate_user' }
  | { ok: false; kind: 'rate_ip' }
  | { ok: false; kind: 'anon_used' };

export type LimitResult = { ok: true } | LimitFailure;

export const CAPACITY_MESSAGE =
  'Beaucoup de monde en ce moment. Reviens dans quelques heures ou passe en pack pour un accès prioritaire.';

const USER_HOURLY_LIMIT = 5;
const IP_DAILY_FREE_LIMIT = 3;

/** Réserve une unité de dépense. Retourne false si un plafond est atteint. */
export async function reserveSpend(
  admin: SupabaseClient,
): Promise<{ ok: true } | { ok: false; reason: 'daily_cap' | 'monthly_cap' }> {
  const { data, error } = await admin.rpc('check_and_reserve_spend', {
    p_daily_cap: env.dailyGenerationCap,
    p_monthly_cap_cents: env.monthlySpendCapCents,
    p_cost_cents: env.costPerGenerationCents,
  });

  if (error) {
    console.error('[limits] check_and_reserve_spend', error.message);
    return { ok: false, reason: 'daily_cap' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const allowed = Boolean((row as { allowed?: boolean } | null)?.allowed);
  const reason = (row as { reason?: string } | null)?.reason;

  if (allowed) return { ok: true };
  return { ok: false, reason: reason === 'monthly_cap' ? 'monthly_cap' : 'daily_cap' };
}

export async function releaseSpend(admin: SupabaseClient): Promise<void> {
  const { error } = await admin.rpc('release_spend', {
    p_cost_cents: env.costPerGenerationCents,
  });
  if (error) console.error('[limits] release_spend', error.message);
}

export async function checkUserRate(
  admin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from('generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);

  if (error) {
    console.error('[limits] checkUserRate', error.message);
    return true;
  }
  return (count ?? 0) < USER_HOURLY_LIMIT;
}

export async function checkIpRate(admin: SupabaseClient, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from('generations')
    .select('id', { count: 'exact', head: true })
    .eq('client_ip', ip)
    .is('user_id', null)
    .gte('created_at', since);

  if (error) {
    console.error('[limits] checkIpRate', error.message);
    return true;
  }
  return (count ?? 0) < IP_DAILY_FREE_LIMIT;
}

/** L'essai anonyme est unique par jeton. */
export async function anonTrialAvailable(
  admin: SupabaseClient,
  anonToken: string,
): Promise<boolean> {
  const { count, error } = await admin
    .from('generations')
    .select('id', { count: 'exact', head: true })
    .eq('anon_token', anonToken);

  if (error) {
    console.error('[limits] anonTrialAvailable', error.message);
    return false;
  }
  return (count ?? 0) === 0;
}

export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first) return first.trim();
  }
  return headers.get('x-real-ip') ?? '0.0.0.0';
}
