import type { CatalogCategory, CatalogItem } from '@/lib/types/db';
import type { OnboardingAnswers } from '@/lib/onboarding';
import { answersToTags } from '@/lib/onboarding';

/**
 * Vue client d'un article de catalogue.
 * `prompt_template` en est volontairement absent : le prompt ne quitte jamais
 * le serveur, et le client ne renvoie qu'un slug.
 */
export interface CatalogItemView {
  id: string;
  slug: string;
  label: string;
  category: CatalogCategory;
  styleTags: string[];
  previewPath: string;
  isPremium: boolean;
}

/** Colonnes sélectionnées côté client. Ne jamais y ajouter `prompt_template`. */
export const CATALOG_PUBLIC_COLUMNS =
  'id, slug, label, category, style_tags, preview_path, is_premium, sort_order';

export function toView(row: Pick<
  CatalogItem,
  'id' | 'slug' | 'label' | 'category' | 'style_tags' | 'preview_path' | 'is_premium'
>): CatalogItemView {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    category: row.category,
    styleTags: row.style_tags,
    previewPath: row.preview_path,
    isPremium: row.is_premium,
  };
}

interface Scored {
  item: CatalogItemView;
  score: number;
  excluded: boolean;
}

/** Dimensions qui pondèrent le classement sans jamais exclure. */
const SCORING_PREFIXES = ['face:', 'style:', 'hairline:', 'bold:'] as const;

/** Longueurs ordonnées : couper est immédiat, laisser pousser ne l'est pas. */
const LENGTH_ORDER = ['len:shaved', 'len:short', 'len:mid', 'len:long'] as const;

function tagsWithPrefix(tags: string[], prefix: string): string[] {
  return tags.filter((t) => t.startsWith(prefix));
}

/** Longueur minimale qu'un jeu de tags exige, sur l'échelle ci-dessus. */
function minLengthRank(tags: string[]): number | null {
  const ranks = tags
    .map((t) => LENGTH_ORDER.indexOf(t as (typeof LENGTH_ORDER)[number]))
    .filter((r) => r >= 0);
  return ranks.length > 0 ? Math.min(...ranks) : null;
}

/**
 * Classement d'un article au regard du profil.
 *
 * Les écrans 2, 3, 5, 7 et 9 filtrent réellement (section 5) : un article que
 * le profil rend irréalisable est écarté, pas juste rétrogradé. Le reste
 * (ligne de cheveux, audace) pondère l'ordre d'affichage.
 *
 * Les deux contraintes dures ne sont pas de même nature :
 *
 *  - la TEXTURE est symétrique. Une coupe pensée pour des cheveux raides ne
 *    tient pas sur des cheveux crépus, et réciproquement.
 *
 *  - la LONGUEUR est asymétrique. On peut toujours couper court des cheveux
 *    longs ; l'inverse demande des mois. Un article n'est donc écarté que
 *    s'il exige PLUS de longueur que celle déclarée — proposer une coupe qui
 *    suppose d'attendre trois mois, c'est exactement le faux espoir que ce
 *    produit existe pour éviter.
 */
function scoreItem(item: CatalogItemView, profileTags: string[]): Scored {
  let score = 0;
  let excluded = false;

  // Texture : contrainte dure, dans les deux sens.
  const wantedTexture = tagsWithPrefix(profileTags, 'tex:');
  const offeredTexture = tagsWithPrefix(item.styleTags, 'tex:');
  if (wantedTexture.length > 0 && offeredTexture.length > 0) {
    if (wantedTexture.some((t) => offeredTexture.includes(t))) {
      score += 3;
    } else {
      excluded = true;
    }
  }

  // Longueur : on n'écarte que ce qui exigerait de laisser pousser.
  const currentRank = minLengthRank(tagsWithPrefix(profileTags, 'len:'));
  const requiredRank = minLengthRank(tagsWithPrefix(item.styleTags, 'len:'));
  if (currentRank !== null && requiredRank !== null) {
    if (requiredRank > currentRank) {
      excluded = true;
    } else if (item.styleTags.includes(LENGTH_ORDER[currentRank] ?? '')) {
      // La coupe est pensée pour la longueur actuelle : cas idéal.
      score += 3;
    } else {
      // Réalisable en coupant, mais moins évidente : on la garde plus bas.
      score += 1;
    }
  }

  for (const prefix of SCORING_PREFIXES) {
    const wanted = tagsWithPrefix(profileTags, prefix);
    const offered = tagsWithPrefix(item.styleTags, prefix);
    if (wanted.length === 0 || offered.length === 0) continue;
    if (!wanted.some((t) => offered.includes(t))) continue;
    // Forme du visage et style orientent fortement ; le reste affine.
    score += prefix === 'face:' || prefix === 'style:' ? 2 : 1;
  }

  return { item, score, excluded };
}

/**
 * Filtre le catalogue pour un profil donné.
 *
 * - Les accessoires suivent l'écran 9 : si l'utilisateur a coché des familles,
 *   seules celles-ci apparaissent ; s'il a répondu « Aucun », la catégorie
 *   accessoires disparaît.
 * - `minItems` garantit qu'un profil très restrictif ne se retrouve jamais
 *   devant une grille vide : on complète avec les meilleurs scores restants.
 */
export function filterCatalog(
  items: CatalogItemView[],
  answers: OnboardingAnswers,
  options: { includePremium?: boolean; minItems?: number } = {},
): CatalogItemView[] {
  const { includePremium = true, minItems = 12 } = options;
  const profileTags = answersToTags(answers);
  const accessoryTags = tagsWithPrefix(profileTags, 'acc:');
  const wantsNoAccessory =
    (answers.accessories ?? []).includes('none') || accessoryTags.length === 0;

  const visible = items.filter((item) => {
    if (!includePremium && item.isPremium) return false;
    if (item.category !== 'accessory') return true;
    if (wantsNoAccessory) return false;
    return item.styleTags.some((t) => accessoryTags.includes(t));
  });

  const scored = visible.map((item) => scoreItem(item, profileTags));
  const kept = scored.filter((s) => !s.excluded);
  const rejected = scored.filter((s) => s.excluded);

  const byScore = (a: Scored, b: Scored): number =>
    b.score - a.score || a.item.label.localeCompare(b.item.label, 'fr');

  const result = kept.sort(byScore).map((s) => s.item);
  if (result.length >= minItems) return result;

  // Repêchage : mieux vaut une suggestion imparfaite qu'une grille vide.
  const filler = rejected.sort(byScore).map((s) => s.item);
  return [...result, ...filler.slice(0, minItems - result.length)];
}

/** Nombre affiché à l'écran 13 : « {n} coupes sélectionnées pour toi ». */
export function countSelectedCuts(
  items: CatalogItemView[],
  answers: OnboardingAnswers,
): number {
  return filterCatalog(items, answers).filter((i) => i.category === 'cut').length;
}

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  cut: 'Coupes',
  color: 'Colorations',
  accessory: 'Accessoires',
};

/** Ordre d'affichage des onglets, orienté par l'objectif déclaré (écran 1). */
export function categoryOrder(goal: string | undefined): CatalogCategory[] {
  switch (goal) {
    case 'color':
      return ['color', 'cut', 'accessory'];
    case 'accessory':
      return ['accessory', 'cut', 'color'];
    default:
      return ['cut', 'color', 'accessory'];
  }
}
