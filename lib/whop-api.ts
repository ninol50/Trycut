import { createAdminSupabase } from '@/lib/supabase/server';
import { WHOP_PLAN_IDS, CREDITS_BY_PLAN } from '@/lib/pricing';

/**
 * Adresses candidates pour lister les abonnements.
 *
 * Whop expose plusieurs familles d'API — « app » pour les applications
 * installées, « company » et v2 pour une entreprise — et la documentation
 * n'est pas consultable depuis cet environnement. Une clé d'entreprise sur une
 * adresse d'application renvoie « API Key is invalid », un message qui ne dit
 * pas que c'est l'adresse le problème. On les essaie donc dans l'ordre, et on
 * s'arrête à la première qui répond.
 */
const WHOP_ENDPOINTS = [
  'https://api.whop.com/api/v2/memberships',
  'https://api.whop.com/v2/memberships',
  'https://api.whop.com/v5/company/memberships',
  'https://api.whop.com/v5/app/memberships',
] as const;

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

  for (const base of WHOP_ENDPOINTS) {
    try {
      const response = await fetch(`${base}?valid=true&per=50`, {
        headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error(
          '[whop-api]',
          base,
          response.status,
          (await response.text()).slice(0, 200),
        );
        continue;
      }

      const rows = extractMemberships(await response.json());
      console.log('[whop-api] adresse retenue', base, '·', rows.length, 'abonnement(s)');
      cache = { at: Date.now(), rows };
      return rows;
    } catch (error) {
      console.error('[whop-api]', base, error);
    }
  }

  return null;
}

/** Offre en cours pour cette adresse, ou null si aucun abonnement valide. */
export async function planForEmail(email: string | null): Promise<'pack' | 'pass' | null> {
  if (!email) return null;
  const rows = await listValidMemberships();
  if (!rows) return null;

  const cible = email.toLowerCase().trim();
  return rows.find((row) => row.email === cible)?.plan ?? null;
}
