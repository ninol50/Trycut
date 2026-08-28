export const RESULT_STORAGE_KEY = 'last_result_v1';

export interface StoredResult {
  generationId: string;
  resultUrl: string;
  beforeUrl: string;
  label: string;
  watermarked: boolean;
}

export function readResult(): StoredResult | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(RESULT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const source = parsed as Record<string, unknown>;

    const resultUrl = source['resultUrl'];
    const generationId = source['generationId'];
    if (typeof resultUrl !== 'string' || typeof generationId !== 'string') return null;

    return {
      generationId,
      resultUrl,
      beforeUrl: typeof source['beforeUrl'] === 'string' ? source['beforeUrl'] : '',
      label: typeof source['label'] === 'string' ? source['label'] : '',
      // Par défaut filigrané : en cas de doute, on n'offre jamais le HD.
      watermarked: source['watermarked'] !== false,
    };
  } catch {
    return null;
  }
}
