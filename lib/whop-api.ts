import { createAdminSupabase } from '@/lib/supabase/server';
import { WHOP_PLAN_IDS, CREDITS_BY_PLAN } from '@/lib/pricing';

const WHOP_API = 'https://api.whop.com/v5/app/memberships';

/** Une minute : assez pour ne pas marteler Whop, assez court pour qu'un
 *  paiement se voie presque tout de suite. */
const CACHE_MS = 60_000;

export interface WhopMembership {
  email: string;
  plan: 'pack' | 'pass';
}

let cache: { at: number; rows: WhopMembership[] } | null = null;

async function readApiKey(): Promise<string | null> {
  const admin = createAdminSupabase();
  if (!admin) return null;

  const { data } = await admin
    .from('app_config')
    .select('whop_api_key')
    .eq('id', 1)
    .maybeSingle();

  const key = (data as { whop_api_key: string | null } | null)?.whop_api_key;
  return key && key.length > 0 ? key : null;
}

/**
 * Parcours tolérant de la réponse : on cherche les couples (email, offre)
 * sans supposer la forme exacte de l'arbre. La documentation Whop n'est pas
 * consultable depuis cet environnement, et coder en dur un chemin faux ferait
 * échouer silencieusement tous les abonnements.
 */
export function extractMemberships(payload: unknown): WhopMembership[] {
  const connus = new Map<string, 'pack' | 'pass'>(
    Object.entries(WHOP_PLAN_IDS).map(([plan, id]) => [id, plan as 'pack' | 'pass']),
  );

  /** Email et offre portés par ce nœud, en descendant dans ses enfants. */
  const lire = (noeud: unknown): WhopMembership | null => {
    let email: string | null = null;
    let plan: 'pack' | 'pass' | null = null;

    const parcourir = (valeur: unknown): void => {
      if (Array.isArray(valeur)) {
        for (const item of valeur) parcourir(item);
        return;
      }
      if (typeof valeur !== 'object' || valeur === null) return;
      for (const [cle, enfant] of Object.entries(valeur)) {
        if (typeof enfant === 'string') {
          if (/email/i.test(cle) && enfant.includes('@')) email ??= enfant.toLowerCase().trim();
          plan ??= connus.get(enfant) ?? null;
        } else {
          parcourir(enfant);
        }
      }
    };

    parcourir(noeud);
    return email && plan ? { email, plan } : null;
  };

  // Les abonnements arrivent dans une liste. On évalue chaque élément de
  // tableau séparément : évaluer la réponse entière d'un bloc n'en verrait
  // qu'un seul, le premier email rencontré s'appariant au premier plan.
  const candidats: unknown[] = [];
  const collecter = (noeud: unknown): void => {
    if (Array.isArray(noeud)) {
      for (const item of noeud) {
        if (item && typeof item === 'object') candidats.push(item);
        collecter(item);
      }
      return;
    }
    if (typeof noeud !== 'object' || noeud === null) return;
    for (const enfant of Object.values(noeud)) collecter(enfant);
  };
  collecter(payload);

  // Réponse sans liste — un abonnement seul, par exemple.
  if (candidats.length === 0) candidats.push(payload);

  const parEmail = new Map<string, 'pack' | 'pass'>();
  for (const candidat of candidats) {
    const row = lire(candidat);
    if (!row) continue;
    const actuel = parEmail.get(row.email);
    // Une même adresse ne compte qu'une fois, la meilleure offre l'emportant.
    if (!actuel || CREDITS_BY_PLAN[row.plan] > CREDITS_BY_PLAN[actuel]) {
      parEmail.set(row.email, row.plan);
    }
  }

  return [...parEmail].map(([email, plan]) => ({ email, plan }));
}

/** Abonnements valides chez Whop. `null` si la clé manque ou si Whop refuse. */
export async function listValidMemberships(force = false): Promise<WhopMembership[] | null> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.rows;

  const key = await readApiKey();
  if (!key) return null;

  try {
    const response = await fetch(`${WHOP_API}?valid=true&per=50`, {
      headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[whop-api] réponse', response.status, (await response.text()).slice(0, 200));
      return null;
    }

    const rows = extractMemberships(await response.json());
    cache = { at: Date.now(), rows };
    return rows;
  } catch (error) {
    console.error('[whop-api] appel', error);
    return null;
  }
}

/** Offre en cours pour cette adresse, ou null si aucun abonnement valide. */
export async function planForEmail(email: string | null): Promise<'pack' | 'pass' | null> {
  if (!email) return null;
  const rows = await listValidMemberships();
  if (!rows) return null;

  const cible = email.toLowerCase().trim();
  return rows.find((row) => row.email === cible)?.plan ?? null;
}
