/**
 * Passage de relais entre l'écran photo et l'écran de génération.
 * Stocké en `sessionStorage` : c'est un état de navigation, pas une donnée
 * à conserver.
 */

export const PENDING_GENERATION_KEY = 'pending_generation_v1';

export interface PendingGeneration {
  storagePath: string;
  catalogItemId: string;
  catalogLabel: string;
  previewUrl: string;
}

export function readPending(): PendingGeneration | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(PENDING_GENERATION_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const source = parsed as Record<string, unknown>;

    const storagePath = source['storagePath'];
    const catalogItemId = source['catalogItemId'];
    if (typeof storagePath !== 'string' || typeof catalogItemId !== 'string') return null;

    return {
      storagePath,
      catalogItemId,
      catalogLabel: typeof source['catalogLabel'] === 'string' ? source['catalogLabel'] : '',
      previewUrl: typeof source['previewUrl'] === 'string' ? source['previewUrl'] : '',
    };
  } catch {
    return null;
  }
}

export function clearPending(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(PENDING_GENERATION_KEY);
}
