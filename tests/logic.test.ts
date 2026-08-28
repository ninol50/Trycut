import assert from 'node:assert/strict';
import test from 'node:test';

import { FALLBACK_CATALOG } from '@/lib/catalog-data';
import { rankCatalog, recommendedItems, scoreItem } from '@/lib/catalog';
import { buildPrompt } from '@/lib/ai/prompt';
import { sniffImageMime, isAcceptedMime, extensionFor } from '@/lib/upload';
import { createAnonToken, verifyAnonToken } from '@/lib/anon-token';
import { getSteps, ONBOARDING_STEPS } from '@/lib/onboarding';
import { PRICING } from '@/lib/pricing';

// ------------------------------------------------------------------ catalogue
test('le catalogue contient 20 coupes, 8 couleurs et 10 accessoires', () => {
  const count = (category: string) =>
    FALLBACK_CATALOG.filter((item) => item.category === category).length;
  assert.equal(FALLBACK_CATALOG.length, 38);
  assert.equal(count('cut'), 20);
  assert.equal(count('color'), 8);
  assert.equal(count('accessory'), 10);
});

test('aucun slug dupliqué', () => {
  const slugs = new Set(FALLBACK_CATALOG.map((item) => item.slug));
  assert.equal(slugs.size, FALLBACK_CATALOG.length);
});

test('les réponses d’onboarding réordonnent réellement le catalogue', () => {
  const crepus = rankCatalog(FALLBACK_CATALOG, {
    texture: 'crepus',
    length: 'court',
    face: 'rond',
    style: 'streetwear',
    goal: 'coupe',
  });
  const raides = rankCatalog(FALLBACK_CATALOG, {
    texture: 'raides',
    length: 'long',
    face: 'allonge',
    style: 'classique',
    goal: 'coupe',
  });

  const topCrepus = crepus.slice(0, 8).map((s) => s.item.slug);
  const topRaides = raides.slice(0, 8).map((s) => s.item.slug);

  assert.notDeepEqual(topCrepus, topRaides);

  // Une coupe taguée `crepus` doit remonter pour un profil crépu.
  const afro = crepus.findIndex((s) => s.item.slug === 'cut-afro-court');
  const afroAilleurs = raides.findIndex((s) => s.item.slug === 'cut-afro-court');
  assert.ok(afro < afroAilleurs, 'l’afro court doit être mieux classé sur cheveux crépus');
});

test('« aucun » sur les accessoires les relègue en fin de liste', () => {
  const ranked = rankCatalog(FALLBACK_CATALOG, { accessories: ['aucun'], goal: 'coupe' });
  const premierAccessoire = ranked.findIndex((s) => s.item.category === 'accessory');
  assert.ok(premierAccessoire > 20, `accessoire trouvé trop tôt (index ${premierAccessoire})`);
});

test('un choix d’accessoire fait remonter la bonne famille', () => {
  const ranked = rankCatalog(FALLBACK_CATALOG, { accessories: ['grillz'], goal: 'accessoires' });
  const premier = ranked[0];
  assert.ok(premier);
  assert.ok(premier.item.style_tags.includes('grillz'), `attendu grillz, reçu ${premier.item.slug}`);
});

test('recommendedItems renvoie toujours 12 entrées, même sans réponses', () => {
  assert.equal(recommendedItems(FALLBACK_CATALOG, {}).length, 12);
  assert.equal(recommendedItems(FALLBACK_CATALOG, { texture: 'boucles' }).length, 12);
});

test('« je ne sais pas » est neutre, il ne pénalise rien', () => {
  const item = FALLBACK_CATALOG.find((candidate) => candidate.slug === 'cut-fade-bas');
  assert.ok(item);
  assert.equal(scoreItem(item, { face: 'inconnu' }), 0);
});

// --------------------------------------------------------------------- prompt
test('le prompt interpole les variables du profil', () => {
  const item = FALLBACK_CATALOG.find((candidate) => candidate.slug === 'cut-fade-bas');
  assert.ok(item);
  const prompt = buildPrompt(item, { texture: 'crepus', length: 'court', beard: 'fournie' });

  assert.match(prompt, /crépus/);
  assert.match(prompt, /courte/);
  assert.match(prompt, /fournie/);
  assert.doesNotMatch(prompt, /\{\{/, 'aucune variable ne doit rester non interpolée');
});

test('aucune variable ne subsiste sur l’ensemble du catalogue', () => {
  for (const item of FALLBACK_CATALOG) {
    const prompt = buildPrompt(item, {});
    assert.doesNotMatch(prompt, /\{\{\w+\}\}/, `variable non résolue dans ${item.slug}`);
  }
});

// --------------------------------------------------------------------- upload
test('le type MIME est déduit de la signature binaire, pas du Content-Type', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const webp = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
  ]);
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

  assert.equal(sniffImageMime(jpeg), 'image/jpeg');
  assert.equal(sniffImageMime(png), 'image/png');
  assert.equal(sniffImageMime(webp), 'image/webp');
  assert.equal(sniffImageMime(pdf), null);
  assert.equal(sniffImageMime(new Uint8Array([])), null);
});

test('seuls JPEG, PNG et WebP sont acceptés', () => {
  assert.ok(isAcceptedMime('image/jpeg'));
  assert.ok(!isAcceptedMime('image/gif'));
  assert.ok(!isAcceptedMime('application/pdf'));
  assert.equal(extensionFor('image/png'), 'png');
  assert.equal(extensionFor('image/heic'), 'jpg');
});

// ---------------------------------------------------------------- jeton anonyme
test('le jeton anonyme est signé et vérifiable', () => {
  const token = createAnonToken();
  assert.ok(verifyAnonToken(token));
});

test('un jeton falsifié est rejeté', () => {
  const token = createAnonToken();
  const [value] = token.split('.');
  assert.equal(verifyAnonToken(`${value}.0000000000000000`), null);
  assert.equal(verifyAnonToken('nimportequoi'), null);
  assert.equal(verifyAnonToken(undefined), null);
  assert.equal(verifyAnonToken(`${value}.`), null);
});

// ----------------------------------------------------------------- onboarding
test('le parcours long compte 13 écrans, le court en sert 5', () => {
  assert.equal(ONBOARDING_STEPS.length, 13);
  assert.equal(getSteps('full').length, 13);
  assert.equal(getSteps('short').length, 5);
});

test('le parcours court conserve les écrans qui filtrent le catalogue', () => {
  const ids = getSteps('short').map((step) => step.id);
  for (const id of ['length', 'texture', 'face', 'first_name', 'summary'] as const) {
    assert.ok(ids.includes(id), `écran ${id} manquant`);
  }
});

// --------------------------------------------------------------------- tarifs
test('les prix sont ceux du brief', () => {
  const byId = Object.fromEntries(PRICING.map((plan) => [plan.id, plan]));
  assert.equal(byId['free']?.price, '0 €');
  assert.equal(byId['pack']?.price, '9,90 €');
  assert.equal(byId['pass']?.price, '19,99 €');
  assert.equal(byId['pack']?.credits, 15);
  assert.equal(byId['pass']?.credits, 80);
  assert.equal(byId['pack']?.highlighted, true);
});
