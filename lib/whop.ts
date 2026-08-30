import { createHmac, timingSafeEqual } from 'node:crypto';
import { CREDITS_BY_PLAN, PLAN_BY_AMOUNT_CENTS, WHOP_PLAN_IDS } from '@/lib/pricing';

/**
 * Whop signe ses webhooks selon la spécification Standard Webhooks :
 * trois en-têtes, et une signature HMAC-SHA256 en base64 calculée sur
 * `id.timestamp.corps`. Le secret est fourni préfixé `whsec_`, et c'est la
 * partie après le préfixe qui est la clé, décodée depuis le base64.
 *
 * L'horodatage est vérifié : sans ça, une requête capturée reste rejouable
 * indéfiniment.
 */
const TOLERANCE_SECONDS = 5 * 60;

export interface WhopHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

export function readWhopHeaders(get: (name: string) => string | null): WhopHeaders {
  return {
    id: get('webhook-id'),
    timestamp: get('webhook-timestamp'),
    signature: get('webhook-signature'),
  };
}

/**
 * Clés candidates dérivées du secret.
 *
 * Whop délivre un secret préfixé `ws_`, là où la spécification Standard
 * Webhooks décrit un `whsec_` suivi d'une clé en base64. Le format exact de la
 * clé n'étant pas vérifiable depuis cet environnement, on essaie les
 * interprétations plausibles plutôt que d'en parier une : se tromper ferait
 * rejeter tous les paiements.
 *
 * Ça n'affaiblit rien — il faut toujours produire un HMAC valide, et toutes
 * ces clés dérivent du même secret.
 */
function candidateKeys(secret: string): Buffer[] {
  const sansPrefixe = secret.replace(/^(whsec_|ws_)/, '');
  const keys = [
    Buffer.from(secret, 'utf8'),
    Buffer.from(sansPrefixe, 'utf8'),
    Buffer.from(sansPrefixe, 'base64'),
    Buffer.from(secret, 'base64'),
  ];

  // Deux clés identiques ne servent à rien, et une clé vide n'est pas une clé.
  const vues = new Set<string>();
  return keys.filter((key) => {
    if (key.length === 0) return false;
    const empreinte = key.toString('hex');
    if (vues.has(empreinte)) return false;
    vues.add(empreinte);
    return true;
  });
}

export function verifyWhopSignature(
  raw: string,
  headers: WhopHeaders,
  secret: string,
  now: number = Date.now(),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret) return false;

  const sent = Number(timestamp);
  if (!Number.isFinite(sent)) return false;
  if (Math.abs(now / 1000 - sent) > TOLERANCE_SECONDS) return false;

  // L'en-tête peut porter plusieurs signatures, séparées par des espaces,
  // chacune préfixée de sa version : « v1,<base64> ».
  const envoyees = signature
    .split(' ')
    .map((part) => (part.includes(',') ? part.slice(part.indexOf(',') + 1) : part))
    .filter((part) => part.length > 0);

  for (const key of candidateKeys(secret)) {
    const attendue = createHmac('sha256', key).update(`${id}.${timestamp}.${raw}`).digest('base64');
    for (const envoyee of envoyees) {
      const a = Buffer.from(envoyee);
      const b = Buffer.from(attendue);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    }
  }

  return false;
}

// ------------------------------------------------------------ lecture
/**
 * Extraction tolérante de la charge utile.
 *
 * L'enveloppe est `{ action | event, data }`, et `data` reprend l'objet de
 * l'API avec l'utilisateur et l'offre développés. Le détail des noms de
 * champs n'étant pas vérifiable depuis cet environnement, on parcourt l'objet
 * plutôt que de coder en dur un chemin qui serait faux au premier paiement.
 * Le corps complet est journalisé une fois : le premier vrai événement permet
 * de resserrer.
 */
function walk(value: unknown, visit: (key: string, value: unknown, parent: string) => void, parent = ''): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit, parent);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    visit(key, child, parent);
    walk(child, visit, key);
  }
}

/** Email de l'acheteur. Celui porté par un objet « user » l'emporte. */
export function extractEmail(payload: unknown): string | null {
  const preferred: string[] = [];
  const fallback: string[] = [];

  walk(payload, (key, value, parent) => {
    if (typeof value !== 'string' || !value.includes('@')) return;
    if (!/email/i.test(key)) return;
    if (/user|member|customer|buyer/i.test(parent)) preferred.push(value);
    else fallback.push(value);
  });

  const found = preferred[0] ?? fallback[0];
  return found ? found.toLowerCase().trim() : null;
}

/** Montant encaissé, en centimes. Whop exprime ses montants en unités. */
export function extractAmountCents(payload: unknown): number | null {
  const amounts: number[] = [];

  walk(payload, (key, value) => {
    if (!/^(final_amount|amount|subtotal|total)$/i.test(key)) return;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) return;
    // Un montant entier supérieur ou égal à 100 est déjà en centimes ; sinon
    // il est exprimé en euros (3 € arrive comme 3 ou 3.0).
    amounts.push(Number.isInteger(n) && n >= 100 ? n : Math.round(n * 100));
  });

  return amounts[0] ?? null;
}

/** Repère laissé dans l'URL de paiement, si Whop le renvoie. */
export function extractUserRef(payload: unknown): string | null {
  const refs: string[] = [];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  walk(payload, (key, value) => {
    if (typeof value !== 'string') return;
    if (/^(ref|user_id|client_reference_id|external_id)$/i.test(key) && uuid.test(value)) {
      refs.push(value);
    }
  });

  return refs[0] ?? null;
}

export function planForAmount(cents: number | null): { plan: 'pack' | 'pass'; credits: number } | null {
  if (cents === null) return null;
  return PLAN_BY_AMOUNT_CENTS[cents] ?? null;
}

/** Identifiant d'offre Whop porté par le message, s'il y en a un. */
export function extractPlanId(payload: unknown): string | null {
  const found: string[] = [];
  const known = new Set(Object.values(WHOP_PLAN_IDS));

  walk(payload, (_key, value) => {
    if (typeof value === 'string' && known.has(value)) found.push(value);
  });

  return found[0] ?? null;
}

/**
 * Offre achetée. L'identifiant d'offre l'emporte : il est stable, alors que le
 * montant dépend de la devise et de l'unité. Le montant ne sert que si aucun
 * identifiant connu n'apparaît dans le message.
 */
export function planForPayload(payload: unknown): { plan: 'pack' | 'pass'; credits: number } | null {
  const planId = extractPlanId(payload);
  if (planId) {
    for (const [plan, id] of Object.entries(WHOP_PLAN_IDS)) {
      if (id === planId) {
        // Le nombre de coupes vient des offres, jamais recopié ici : sinon
        // l'affichage et le crédit finissent par diverger en silence.
        const key = plan as 'pack' | 'pass';
        return { plan: key, credits: CREDITS_BY_PLAN[key] };
      }
    }
  }
  return planForAmount(extractAmountCents(payload));
}

/** Événements qui accordent l'accès, et ceux qui le referment. */
export const GRANTING_EVENTS = ['payment.succeeded', 'payment_succeeded'] as const;
/**
 * Deux nominations coexistent selon les versions de l'API Whop —
 * `went_invalid` dans la documentation, `deactivated` dans l'assistant du
 * tableau de bord. On écoute les deux : un nom manquant, et une résiliation
 * laisserait l'accès ouvert indéfiniment.
 */
export const REVOKING_EVENTS = [
  'membership.went_invalid',
  'membership_went_invalid',
  'membership.deactivated',
  'membership_deactivated',
  'membership.cancelled',
  'membership.canceled',
  'payment.failed',
  'payment_failed',
] as const;

export function eventName(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) return '';
  const record = payload as Record<string, unknown>;
  const raw = record['action'] ?? record['event'] ?? record['type'];
  return typeof raw === 'string' ? raw : '';
}
