'use client';

/**
 * Brouillon du studio : la photo choisie et les styles cochés, mémorisés le
 * temps d'un aller-retour par la page de paiement.
 *
 * Sans lui, l'enchaînement « je choisis, ça bloque, je paie » renvoie la
 * personne sur un studio vide : elle a payé et doit tout recommencer. On garde
 * donc son travail côté navigateur — jamais côté serveur, puisqu'une photo
 * n'est déposée qu'après paiement.
 *
 * Tout est enveloppé de `try` : en navigation privée, ou quand le quota de
 * stockage est atteint, l'écriture lève. Le brouillon est un confort, il ne
 * doit jamais casser le studio.
 */

const KEY = 'trycut_studio_draft';

/**
 * Au-delà, la photo ne tient pas dans le stockage local (5 Mo en général).
 * On garde alors les styles seuls plutôt que de tout perdre.
 */
const MAX_PHOTO_CHARS = 3_000_000;

/** Un brouillon plus vieux qu'une demi-journée ne correspond plus à rien. */
const TTL_MS = 12 * 60 * 60 * 1000;

export interface StudioDraft {
  /** Photo compressée, en data URL. `null` si elle ne tenait pas. */
  photo: string | null;
  /** Identifiants des styles cochés, dans l'ordre de sélection. */
  styleIds: readonly string[];
}

function estTableauDeChaines(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

export function saveDraft(draft: StudioDraft): void {
  try {
    const photo = draft.photo && draft.photo.length <= MAX_PHOTO_CHARS ? draft.photo : null;
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ photo, styleIds: draft.styleIds, savedAt: Date.now() }),
    );
  } catch {
    // Quota atteint ou stockage refusé : on continue sans brouillon.
  }
}

export function readDraft(): StudioDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const record = parsed as Record<string, unknown>;
    const savedAt = typeof record['savedAt'] === 'number' ? record['savedAt'] : 0;
    if (Date.now() - savedAt > TTL_MS) {
      clearDraft();
      return null;
    }

    const photo = typeof record['photo'] === 'string' ? record['photo'] : null;
    const styleIds = estTableauDeChaines(record['styleIds']) ? record['styleIds'] : [];
    if (!photo && styleIds.length === 0) return null;

    return { photo, styleIds };
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Rien à nettoyer si le stockage est refusé.
  }
}

/** Photo compressée → data URL, pour la mémoriser. */
export function fileToDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    } catch {
      resolve(null);
    }
  });
}

/** Data URL mémorisée → fichier, pour reprendre là où on s'était arrêté. */
export function dataUrlToFile(photo: string): File | null {
  try {
    const virgule = photo.indexOf(',');
    if (virgule === -1) return null;

    const binaire = window.atob(photo.slice(virgule + 1));
    const octets = new Uint8Array(binaire.length);
    for (let index = 0; index < binaire.length; index += 1) {
      octets[index] = binaire.charCodeAt(index);
    }

    return new File([octets], 'selfie.jpg', { type: 'image/jpeg' });
  } catch {
    return null;
  }
}
