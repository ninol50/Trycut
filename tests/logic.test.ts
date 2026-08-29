import assert from 'node:assert/strict';
import test from 'node:test';

import { CATALOG_SEED, FALLBACK_CATALOG } from '@/lib/catalog-data';
import { rankCatalog, recommendedItems, scoreItem } from '@/lib/catalog';
import { buildPrompt } from '@/lib/ai/prompt';
import { sniffImageMime, isAcceptedMime, extensionFor } from '@/lib/upload';
import { createAnonToken, verifyAnonToken } from '@/lib/anon-token';
import { getSteps, ONBOARDING_STEPS } from '@/lib/onboarding';
import { PRICING, PLAN_BY_AMOUNT_CENTS, withCheckoutReference } from '@/lib/pricing';
import { hasPaidAccess } from '@/lib/profile';
import type { Profile } from '@/types/db';
import { isFailureCallback, extractResultImageUrl, buildFalEndpoint } from '@/lib/ai/callback';

// ------------------------------------------------------------------ catalogue
test('le catalogue contient 16 coupes, 9 barbes, 8 couleurs et 10 accessoires', () => {
  const count = (category: string) =>
    FALLBACK_CATALOG.filter((item) => item.category === category).length;
  assert.equal(FALLBACK_CATALOG.length, 43);
  assert.equal(count('cut'), 16);
  assert.equal(count('beard'), 9);
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
  const item = FALLBACK_CATALOG.find((candidate) => candidate.slug === 'cut-buzz');
  assert.ok(item);
  assert.equal(scoreItem(item, { face: 'inconnu' }), 0);
});

// --------------------------------------------------------------------- prompt
const seeded = (slug: string) => {
  const item = CATALOG_SEED.find((candidate) => candidate.slug === slug);
  assert.ok(item, `gabarit introuvable : ${slug}`);
  return item;
};

test('le prompt reprend les précisions du profil, en anglais', () => {
  const prompt = buildPrompt([seeded('color-platine').prompt_template], ['color'], {
    texture: 'crepus',
    length: 'court',
    beard: 'fournie',
  });

  assert.match(prompt, /coily/);
  assert.match(prompt, /short/);
  assert.match(prompt, /full beard/);
  assert.doesNotMatch(prompt, /\{\{/, 'aucune variable ne doit rester non interpolée');
});

test('sans questionnaire, aucune précision vide n’est ajoutée', () => {
  // Les valeurs par défaut affirmaient « longueur actuelle, barbe inchangée » à
  // chaque rendu : trois phrases sans information qui diluaient la consigne.
  const prompt = buildPrompt([seeded('cut-buzz').prompt_template], ['cut'], {});

  assert.doesNotMatch(prompt, /Current hair texture/);
  assert.doesNotMatch(prompt, /Current hair length/);
  assert.doesNotMatch(prompt, /Beard:/);
});

test('une coupe seule interdit de toucher à la barbe et à la couleur', () => {
  // Un modèle d'édition change tout ce qu'on ne lui interdit pas.
  const prompt = buildPrompt([seeded('cut-buzz').prompt_template], ['cut'], {});

  assert.match(prompt, /Keep the existing facial hair/);
  assert.match(prompt, /Keep the existing hair colour/);
  assert.doesNotMatch(prompt, /Keep the existing hairstyle/, 'la coupe est justement ce qu’on change');
});

test('coupe et barbe combinées ne se contredisent pas', () => {
  // C'est le piège du choix multiple : chaque gabarit portait autrefois sa
  // propre clause « garde le reste », et deux styles ensemble s'annulaient.
  const prompt = buildPrompt(
    [seeded('cut-buzz').prompt_template, seeded('beard-moustache').prompt_template],
    ['cut', 'beard'],
    {},
  );

  assert.match(prompt, /buzz cut/);
  assert.match(prompt, /moustache/);
  assert.doesNotMatch(prompt, /Keep the existing facial hair/, 'la barbe est demandée, on ne la fige pas');
  assert.doesNotMatch(prompt, /Keep the existing hairstyle/, 'la coupe est demandée, on ne la fige pas');
  assert.match(prompt, /Keep the existing hair colour/, 'la couleur n’est pas demandée : elle doit être figée');
});

test('chaque rendu exige de préserver le visage', () => {
  // Sans cette clause, le modèle d'édition reconstruit la personne au lieu de
  // lui changer les cheveux.
  for (const item of CATALOG_SEED) {
    const prompt = buildPrompt([item.prompt_template], [item.category], {});
    assert.match(prompt, /Do not change the face/, `clause d'identité absente sur ${item.slug}`);
    assert.match(prompt, /Photorealistic/, `exigence photoréaliste absente sur ${item.slug}`);
  }
});

test('les consignes envoyées au modèle sont en anglais', () => {
  // Le modèle est entraîné très majoritairement en anglais : une consigne
  // française est suivie approximativement, ce qui donnait des rendus ratés.
  const accents = /[àâäçéèêëîïôöùûüœ]/i;
  for (const item of CATALOG_SEED) {
    assert.doesNotMatch(
      item.prompt_template,
      accents,
      `le gabarit de ${item.slug} contient encore du français`,
    );
  }
});

test('aucun gabarit ne porte sa propre clause de préservation', () => {
  // Elle se calcule désormais à partir des familles non demandées : la laisser
  // dans le gabarit ferait resurgir la contradiction du choix multiple.
  for (const item of CATALOG_SEED) {
    assert.doesNotMatch(
      item.prompt_template,
      /Keep the existing/,
      `le gabarit de ${item.slug} fige encore quelque chose lui-même`,
    );
  }
});

test('aucune variable ne subsiste sur l’ensemble du catalogue', () => {
  for (const item of CATALOG_SEED) {
    const prompt = buildPrompt([item.prompt_template], [item.category], {});
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
test('le parcours par défaut ne pose aucune question', () => {
  assert.equal(getSteps('none').length, 0);
});

test('les parcours optionnels restent servis', () => {
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
test('les offres et le nombre de coupes sont ceux demandés', () => {
  const byId = Object.fromEntries(PRICING.map((plan) => [plan.id, plan]));

  assert.equal(byId['free']?.price, '0 €');
  assert.equal(byId['free']?.credits, 0);

  assert.equal(byId['pack']?.price, '9,99 €');
  assert.equal(byId['pack']?.credits, 15);
  assert.equal(byId['pack']?.highlighted, true);

  assert.equal(byId['pass']?.price, '17,90 €');
  assert.equal(byId['pass']?.credits, 50);
});

test('les offres payantes portent un lien de paiement Stripe', () => {
  for (const plan of PRICING) {
    if (plan.credits === 0) {
      assert.equal(plan.paymentLink, undefined);
      continue;
    }
    assert.match(plan.paymentLink ?? '', /^https:\/\/buy\.stripe\.com\//);
  }
});

test('le montant facturé suffit à retrouver l’offre', () => {
  assert.deepEqual(PLAN_BY_AMOUNT_CENTS[999], { plan: 'pack', credits: 15 });
  assert.deepEqual(PLAN_BY_AMOUNT_CENTS[1790], { plan: 'pass', credits: 50 });
  assert.equal(PLAN_BY_AMOUNT_CENTS[1234], undefined);
});

// ------------------------------------------------- authentification du webhook
test('le jeton de rappel du webhook IA est signé par génération', async () => {
  const { signWebhookToken, verifyWebhookToken } = await import('@/lib/anon-token');
  const id = 'b3f1c0de-0000-4000-8000-000000000001';
  const autre = 'b3f1c0de-0000-4000-8000-000000000002';

  assert.ok(verifyWebhookToken(id, signWebhookToken(id)));
  // Un jeton valide pour une génération ne vaut pas pour une autre.
  assert.equal(verifyWebhookToken(autre, signWebhookToken(id)), false);
  assert.equal(verifyWebhookToken(id, null), false);
  assert.equal(verifyWebhookToken(id, 'court'), false);
});

// ------------------------------------------- variables vides côté Vercel
test('une variable définie mais vide retombe sur la valeur par défaut', async () => {
  // Vercel définit ses variables même vides : `??` ne les rattrape pas, `||` si.
  // C'est ce qui avait envoyé `api_host: ""` à PostHog en production.
  const before = process.env['NEXT_PUBLIC_POSTHOG_HOST'];
  process.env['NEXT_PUBLIC_POSTHOG_HOST'] = '';

  const source = await import('node:fs').then((fs) =>
    fs.readFileSync('lib/public-env.ts', 'utf8'),
  );

  if (before === undefined) delete process.env['NEXT_PUBLIC_POSTHOG_HOST'];
  else process.env['NEXT_PUBLIC_POSTHOG_HOST'] = before;

  // Aucun `??` ne doit subsister sur une variable d'environnement publique.
  const risky = source.match(/process\.env\.NEXT_PUBLIC_\w+\s*\?\?/g) ?? [];
  assert.deepEqual(risky, [], `repli fragile : ${risky.join(', ')}`);
});

test('les liens de paiement ne peuvent pas être vidés par une variable vide', async () => {
  const source = await import('node:fs').then((fs) =>
    fs.readFileSync('lib/pricing.ts', 'utf8'),
  );
  const risky = source.match(/process\.env\.NEXT_PUBLIC_\w+\s*\?\?/g) ?? [];
  assert.deepEqual(risky, [], `repli fragile : ${risky.join(', ')}`);
});

test('le repli statique ne contient aucun prompt', () => {
  // Le gabarit ne doit jamais atteindre le navigateur : Postgres le refuse déjà
  // au client, le repli doit tenir la même ligne.
  for (const item of FALLBACK_CATALOG) {
    assert.ok(!('prompt_template' in item), `prompt exposé sur ${item.slug}`);
  }
});

test('le lien de paiement emporte le compte qui clique', () => {
  const link = withCheckoutReference(
    'https://buy.stripe.com/3cIaEWgRT65x5ye2sU2wU06',
    '8f807898-c4ba-4229-a9a9-dce6e5f4a0a2',
    'client@exemple.fr',
  );
  const url = new URL(link);

  // Sans cet identifiant, le webhook ne sait pas qui créditer : le paiement
  // passe et le compte reste à zéro coupe.
  assert.equal(
    url.searchParams.get('client_reference_id'),
    '8f807898-c4ba-4229-a9a9-dce6e5f4a0a2',
  );
  assert.equal(url.searchParams.get('prefilled_email'), 'client@exemple.fr');
  assert.equal(url.origin + url.pathname, 'https://buy.stripe.com/3cIaEWgRT65x5ye2sU2wU06');
});

test('un email absent ne vide pas le paramètre', () => {
  const url = new URL(withCheckoutReference('https://buy.stripe.com/abc', 'user-1', null));
  assert.equal(url.searchParams.has('prefilled_email'), false);
  assert.equal(url.searchParams.get('client_reference_id'), 'user-1');
});

// ------------------------------------------------- rappel des fournisseurs IA
test('le rendu de fal.ai est lu dans son enveloppe', () => {
  // Forme réelle d'un rappel de file d'attente fal.ai.
  const rappel = {
    request_id: 'abc-123',
    status: 'OK',
    payload: { images: [{ url: 'https://fal.media/files/coupe.jpeg', content_type: 'image/jpeg' }] },
  };
  assert.equal(extractResultImageUrl(rappel), 'https://fal.media/files/coupe.jpeg');
  assert.equal(isFailureCallback(rappel), false);
});

test('un echec de fal.ai est reconnu malgre la casse', () => {
  // fal.ai écrit ERROR en majuscules ; sans normalisation, l'échec passait
  // pour une réussite et la coupe n'était jamais remboursée.
  assert.equal(isFailureCallback({ status: 'ERROR', error: 'boom' }), true);
  assert.equal(isFailureCallback({ status: 'failed' }), true);
  assert.equal(isFailureCallback({ status: 'OK' }), false);
});

test('le rappel du mock reste lu tel quel', () => {
  assert.equal(extractResultImageUrl({ image_url: 'https://exemple.fr/a.jpg' }), 'https://exemple.fr/a.jpg');
  assert.equal(extractResultImageUrl({ image_url: null, source_path: 'u/1.jpg' }), null);
});

test('une enveloppe vide ne fait pas passer une image fantome', () => {
  assert.equal(extractResultImageUrl({ status: 'OK', payload: { images: [] } }), null);
  assert.equal(extractResultImageUrl({ status: 'OK' }), null);
  assert.equal(extractResultImageUrl(null), null);
});

test('l’adresse de rappel voyage dans l’URL, pas dans le corps', () => {
  // Placé dans le corps de la requête, fal_webhook est ignoré sans erreur :
  // la tâche est acceptée, se termine, et le rappel n'arrive jamais.
  const endpoint = new URL(
    buildFalEndpoint(
      'fal-ai/flux-pro/kontext',
      'https://trycutapps.site/api/webhooks/ai',
      'gen-1',
      'secret/avec+caracteres',
    ),
  );

  assert.equal(endpoint.origin + endpoint.pathname, 'https://queue.fal.run/fal-ai/flux-pro/kontext');

  const callback = new URL(endpoint.searchParams.get('fal_webhook') ?? '');
  assert.equal(callback.origin + callback.pathname, 'https://trycutapps.site/api/webhooks/ai');
  assert.equal(callback.searchParams.get('generation_id'), 'gen-1');
  // Le secret doit ressortir intact malgré le double encodage.
  assert.equal(callback.searchParams.get('secret'), 'secret/avec+caracteres');
});

test('aucun client Supabase ne lit NEXT_PUBLIC_ en direct', async () => {
  // Vercel définit ses variables même vides. Une lecture directe de
  // process.env échouait donc là où le reste du site retombait sur son repli :
  // le rappel du fournisseur d'IA répondait 500 et la coupe était perdue.
  const source = await import('node:fs').then((fs) =>
    fs.readFileSync('lib/supabase/server.ts', 'utf8'),
  );
  assert.equal(
    /required\(\s*'NEXT_PUBLIC_/.test(source),
    false,
    'lib/supabase/server.ts doit passer par `env`, jamais par required() sur une variable NEXT_PUBLIC_',
  );
});

test('une coupe seule ne doit toucher que les cheveux', () => {
  const prompt = buildPrompt([seeded('cut-buzz').prompt_template], ['cut'], {});

  assert.match(prompt, /Change only the hair on the head\./);
  assert.match(prompt, /Do not change the face/);
  assert.match(prompt, /same individual/);
  assert.match(prompt, /Keep the existing facial hair/, 'la barbe doit rester figée');
});

test('la portée nomme les deux familles quand deux sont choisies', () => {
  const prompt = buildPrompt(
    [seeded('cut-buzz').prompt_template, seeded('beard-moustache').prompt_template],
    ['cut', 'beard'],
    {},
  );

  assert.match(prompt, /Change only the hair on the head and the facial hair\./);
  assert.match(prompt, /Do not change the face/);
});

test('chaque style du catalogue a son dessin', async () => {
  // Les vignettes sont dessinées, jamais photographiées : une photo montrerait
  // une personne réelle sur un site marchand. Un style sans dessin afficherait
  // une tuile vide.
  const source = await import('node:fs').then((fs) =>
    fs.readFileSync('components/catalog/StyleIllustration.tsx', 'utf8'),
  );

  for (const item of CATALOG_SEED) {
    if (item.category === 'color' || item.category === 'accessory') continue;
    assert.ok(
      source.includes(`'${item.slug}'`),
      `aucun dessin pour ${item.slug}`,
    );
  }
});

// --------------------------------------------------------------------- accès
const profile = (over: Partial<Profile>): Profile =>
  ({
    id: 'u',
    email: 'a@b.fr',
    first_name: null,
    plan: 'free',
    subscription_status: 'none',
    credits_remaining: 0,
    access_status: 'approved',
    is_admin: false,
    age_confirmed: true,
    stripe_customer_id: null,
    current_period_end: null,
    created_at: '2026-01-01',
    ...over,
  }) as Profile;

test('sans abonnement, aucun accès', () => {
  // Un compte existe pour recevoir l'abonnement, pas pour essayer le produit.
  assert.equal(hasPaidAccess(profile({})), false);
  assert.equal(hasPaidAccess(profile({ credits_remaining: 5 })), false, 'des coupes sans offre active ne suffisent pas');
  assert.equal(hasPaidAccess(profile({ plan: 'pack', subscription_status: 'none' })), false);
});

test('un abonnement actif ouvre l’accès', () => {
  assert.equal(hasPaidAccess(profile({ plan: 'pack', subscription_status: 'active' })), true);
  assert.equal(hasPaidAccess(profile({ plan: 'pass', subscription_status: 'active' })), true);
});

test('un impayé referme l’accès, un bannissement aussi', () => {
  assert.equal(hasPaidAccess(profile({ plan: 'pack', subscription_status: 'past_due' })), false);
  assert.equal(
    hasPaidAccess(profile({ plan: 'pack', subscription_status: 'active', access_status: 'rejected' })),
    false,
    'un compte banni passe avant l’abonnement',
  );
});

test('un administrateur garde l’accès à son propre produit', () => {
  assert.equal(hasPaidAccess(profile({ is_admin: true })), true);
});
