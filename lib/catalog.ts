import type { CatalogItem } from '@/types/db';
import {
  answerAsArray,
  answerAsString,
  type OnboardingAnswers,
} from '@/lib/onboarding';

/**
 * Filtrage réel du catalogue par le profil d'onboarding (section 5, non négociable).
 * Les réponses 2 (longueur), 3 (texture), 5 (visage), 7 (style) et 9 (accessoires)
 * pilotent le score. Un item sans tag sur une dimension reste neutre sur celle-ci.
 */

export interface ScoredItem {
  item: CatalogItem;
  score: number;
}

const LENGTH_TAGS = ['rase', 'court', 'mi-long', 'long'] as const;
const TEXTURE_TAGS = ['raides', 'ondules', 'boucles', 'crepus'] as const;
const FACE_TAGS = ['ovale', 'rond', 'carre', 'allonge'] as const;
const STYLE_TAGS = ['classique', 'streetwear', 'sportif', 'soigne'] as const;
const ACCESSORY_TAGS = ['chaines', 'boucles', 'grillz'] as const;
const BOLDNESS_TAGS = ['discret', 'modere', 'remarque'] as const;

function scoreDimension(
  itemTags: readonly string[],
  dimension: readonly string[],
  answer: string | undefined,
  weight: number,
): number {
  if (!answer || answer === 'inconnu' || answer === 'non-precise') return 0;
  const tagsInDimension = itemTags.filter((tag) => dimension.includes(tag));
  if (tagsInDimension.length === 0) return 0; // neutre
  return tagsInDimension.includes(answer) ? weight : -weight;
}

export function scoreItem(item: CatalogItem, answers: OnboardingAnswers): number {
  const tags = item.style_tags;
  let score = 0;

  score += scoreDimension(tags, TEXTURE_TAGS, answerAsString(answers, 'texture'), 4);
  score += scoreDimension(tags, LENGTH_TAGS, answerAsString(answers, 'length'), 3);
  score += scoreDimension(tags, FACE_TAGS, answerAsString(answers, 'face'), 3);
  score += scoreDimension(tags, STYLE_TAGS, answerAsString(answers, 'style'), 2);
  score += scoreDimension(tags, BOLDNESS_TAGS, answerAsString(answers, 'boldness'), 1);

  // Accessoires : multi-choix. « Aucun » relègue toute la famille en fin de liste.
  if (item.category === 'accessory') {
    const wanted = answerAsArray(answers, 'accessories');
    if (wanted.length > 0 && !wanted.includes('aucun')) {
      const family = tags.find((tag) => ACCESSORY_TAGS.includes(tag as never));
      score += family && wanted.includes(family) ? 5 : -6;
    } else if (wanted.includes('aucun')) {
      score -= 8;
    }
  }

  // L'objectif déclaré remonte la catégorie correspondante.
  const goal = answerAsString(answers, 'goal');
  if (goal === 'coupe' && item.category === 'cut') score += 3;
  if (goal === 'couleur' && item.category === 'color') score += 3;
  if (goal === 'accessoires' && item.category === 'accessory') score += 3;

  return score;
}

/** Trie le catalogue par pertinence. Rien n'est masqué : tout reste accessible. */
export function rankCatalog(
  items: readonly CatalogItem[],
  answers: OnboardingAnswers,
): ScoredItem[] {
  return items
    .map((item) => ({ item, score: scoreItem(item, answers) }))
    .sort((a, b) => b.score - a.score || a.item.sort_order - b.item.sort_order);
}

/** Les N entrées réellement recommandées (score positif), N=12 par défaut. */
export function recommendedItems(
  items: readonly CatalogItem[],
  answers: OnboardingAnswers,
  limit = 12,
): CatalogItem[] {
  const ranked = rankCatalog(items, answers);
  const positive = ranked.filter((scored) => scored.score > 0);
  const pool = positive.length >= limit ? positive : ranked;
  return pool.slice(0, limit).map((scored) => scored.item);
}

export const CATEGORY_LABELS: Record<CatalogItem['category'], string> = {
  cut: 'Coupes',
  color: 'Couleurs',
  accessory: 'Accessoires',
};
