import assert from 'node:assert/strict';
import test from 'node:test';

import { CATALOG_SEED, FALLBACK_CATALOG } from '@/lib/catalog-data';
import { rankCatalog, recommendedItems, scoreItem } from '@/lib/catalog';
import { buildPrompt } from '@/lib/ai/prompt';
import { sniffImageMime, isAcceptedMime, extensionFor } from '@/lib/upload';
import { createAnonToken, verifyAnonToken } from '@/lib/anon-token';
import { getSteps, ONBOARDING_STEPS } from '@/lib/onboarding';
import { PRICING, PLAN_BY_AMOUNT_CENTS, withCheckoutReference } from '@/lib/pricing';
import { createHmac } from 'node:crypto';
import {
  GRANTING_EVENTS,
  REVOKING_EVENTS,
  verifyWhopSignature,
  extractEmail,
  extractAmountCents,
  extractPlanId,
  planForAmount,
  planForPayload,
} from '@/lib/whop';
import { CREDITS_BY_PLAN, WHOP_PLAN_IDS } from '@/lib/pricing';
import { hasPaidAccess } from '@/lib/profile';
import type { Profile } from '@/types/db';
import { isFailureCallback, extractResultImageUrl, buildFalEndpoint } from '@/lib/ai/callback';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXAMPLE_PAIRS, HERO_PEOPLE, resolveExamples, resolveHeroFrames } from '@/lib/demo-assets';

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

  // Hebdomadaire : point d'entrée, volontairement moins avantageux.
  assert.equal(byId['pack']?.price, '3 €');
  assert.equal(byId['pack']?.period, '/semaine');
  assert.equal(byId['pack']?.credits, 5);

  // Mensuel : l'offre mise en avant, prix barré à 12 €.
  assert.equal(byId['pass']?.price, '10 €');
  assert.equal(byId['pass']?.strikePrice, '12 €');
  assert.equal(byId['pass']?.period, '/mois');
  assert.equal(byId['pass']?.credits, 23);
  assert.equal(byId['pass']?.highlighted, true);
});

test('le mensuel reste la meilleure affaire face à l’hebdomadaire', () => {
  // Si l'hebdomadaire devenait plus intéressant, l'échelle de prix
  // n'aurait plus de sens : personne ne prendrait le mensuel.
  const byId = Object.fromEntries(PRICING.map((plan) => [plan.id, plan]));
  const hebdo = byId['pack'];
  const mensuel = byId['pass'];
  assert.ok(hebdo && mensuel);

  const coutMensuelDeLHebdo = 3 * (52 / 12);
  const coupesMensuellesDeLHebdo = (hebdo?.credits ?? 0) * (52 / 12);

  assert.ok(coutMensuelDeLHebdo > 10, 'l’hebdomadaire doit coûter plus cher sur un mois');
  assert.ok(
    (mensuel?.credits ?? 0) > coupesMensuellesDeLHebdo,
    'le mensuel doit donner plus de coupes',
  );
});

test('chaque offre payante pointe vers son propre paiement Whop', () => {
  for (const plan of PRICING) {
    if (plan.credits === 0) {
      assert.equal(plan.paymentLink, undefined);
      continue;
    }
    assert.match(plan.paymentLink ?? '', /^https:\/\/whop\.com\/checkout\/plan_/);

    // Le lien et la table de correspondance doivent désigner la même offre,
    // sinon on crédite l'offre d'à côté.
    const id = WHOP_PLAN_IDS[plan.id as 'pack' | 'pass'];
    assert.ok(
      plan.paymentLink?.endsWith(id),
      `${plan.name} : le lien ne correspond pas à l’identifiant ${id}`,
    );
  }

  const ids = Object.values(WHOP_PLAN_IDS);
  assert.equal(new Set(ids).size, ids.length, 'deux offres partagent le même identifiant');
});

test('l’identifiant d’offre l’emporte sur le montant', () => {
  // Le montant peut arriver dans une unité inattendue ; l'identifiant, non.
  const payload = {
    action: 'payment.succeeded',
    data: { final_amount: 3, plan: { id: WHOP_PLAN_IDS.pass } },
  };
  assert.equal(extractPlanId(payload), WHOP_PLAN_IDS.pass);
  assert.deepEqual(planForPayload(payload), { plan: 'pass', credits: CREDITS_BY_PLAN.pass });

  // Sans identifiant connu, on retombe sur le montant.
  assert.deepEqual(planForPayload({ data: { final_amount: 3 } }), {
    plan: 'pack',
    credits: CREDITS_BY_PLAN.pack,
  });

  // Ni l'un ni l'autre : on ne crédite rien.
  assert.equal(planForPayload({ data: { final_amount: 7.5 } }), null);
});

test('le montant facturé suffit à retrouver l’offre', () => {
  assert.deepEqual(PLAN_BY_AMOUNT_CENTS[300], { plan: 'pack', credits: 5 });
  assert.deepEqual(PLAN_BY_AMOUNT_CENTS[1000], { plan: 'pass', credits: 23 });
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
    'https://whop.com/checkout/plan_FqNwkkzr18mMH',
    '8f807898-c4ba-4229-a9a9-dce6e5f4a0a2',
    'client@exemple.fr',
  );
  const url = new URL(link);

  // Sans l'email, le webhook ne sait pas qui créditer : le paiement passe et
  // le compte reste à zéro coupe.
  assert.equal(url.searchParams.get('email'), 'client@exemple.fr');
  assert.equal(url.searchParams.get('ref'), '8f807898-c4ba-4229-a9a9-dce6e5f4a0a2');
  assert.equal(url.origin + url.pathname, 'https://whop.com/checkout/plan_FqNwkkzr18mMH');
});

test('un email absent ne vide pas le paramètre', () => {
  const url = new URL(withCheckoutReference('https://whop.com/checkout/plan_FqNwkkzr18mMH', 'user-1', null));
  assert.equal(url.searchParams.has('email'), false);
  assert.equal(url.searchParams.get('ref'), 'user-1');
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
  assert.equal(
    hasPaidAccess(profile({ credits_remaining: 5 })),
    false,
    'des coupes sans offre active ne suffisent pas',
  );
  assert.equal(hasPaidAccess(profile({ plan: 'pack', subscription_status: 'none' })), false);
});

test('un abonnement actif ouvre l’accès', () => {
  assert.equal(hasPaidAccess(profile({ plan: 'pack', subscription_status: 'active' })), true);
  assert.equal(hasPaidAccess(profile({ plan: 'pass', subscription_status: 'active' })), true);
});

test('l’accès offert ouvre l’accès sans abonnement', () => {
  // Le seul moyen d'entrer sans payer, et il se décide à la main depuis /admin.
  assert.equal(hasPaidAccess(profile({ access_status: 'granted' })), true);
});

test('un blocage l’emporte sur tout le reste', () => {
  assert.equal(hasPaidAccess(profile({ plan: 'pack', subscription_status: 'past_due' })), false);
  assert.equal(
    hasPaidAccess(profile({ access_status: 'rejected', plan: 'pack', subscription_status: 'active' })),
    false,
    'un compte bloqué reste bloqué même abonné',
  );
  assert.equal(
    hasPaidAccess(profile({ access_status: 'rejected', is_admin: true })),
    false,
    'un compte bloqué reste bloqué même administrateur',
  );
});

test('un administrateur garde l’accès à son propre produit', () => {
  assert.equal(hasPaidAccess(profile({ is_admin: true })), true);
});

// ----------------------------------------------------------------- hero
test('chaque coupe du hero existe au catalogue et sait se dessiner', () => {
  // Un slug fautif ne casse rien : il rend une tête sans cheveux, en boucle,
  // sur la première carte que voit un visiteur. Le test attrape la faute de
  // frappe que l'œil laisse passer.
  const illustration = readFileSync(
    join(process.cwd(), 'components/catalog/StyleIllustration.tsx'),
    'utf8',
  );
  const drawn = new Set(
    [...illustration.matchAll(/^ {2}'(cut-[a-z0-9-]+)':/gm)].map((match) => match[1]),
  );

  const slugs = HERO_PEOPLE.flatMap((person) => [
    person.baseSlug,
    ...person.looks.map((look) => look.slug),
  ]);

  for (const slug of slugs) {
    const item = FALLBACK_CATALOG.find((candidate) => candidate.slug === slug);
    assert.ok(item, `${slug} : absent du catalogue`);
    assert.equal(item?.category, 'cut', 'le hero ne montre que des coupes');
    assert.ok(drawn.has(slug), `${slug} : aucun dessin dans StyleIllustration`);
  }
});

test('une personne du hero ne montre jamais une coupe deux fois', () => {
  for (const person of HERO_PEOPLE) {
    const slugs = person.looks.map((look) => look.slug);
    assert.equal(new Set(slugs).size, slugs.length, `${person.id} : coupe en double`);
    assert.ok(
      !slugs.includes(person.baseSlug),
      `${person.id} : la coupe de départ est aussi proposée en arrivée`,
    );
  }
});

test('le hero ne mélange jamais photo et dessin dans la même étape', () => {
  // Une photo d'un côté du séparateur et un dessin de l'autre donnerait une
  // carte incohérente. C'est tout l'un ou tout l'autre, étape par étape.
  const frames = resolveHeroFrames();
  assert.ok(frames.length > 0, 'le hero ne doit jamais être vide');

  for (const frame of frames) {
    assert.equal(
      frame.before.src === null,
      frame.after.src === null,
      `${frame.id} : une moitié en photo, l'autre en dessin`,
    );
    assert.ok(frame.label.length > 0, `${frame.id} : étape sans nom`);
  }
});

test('le hero réutilise les photos des exemples, sans second dépôt', () => {
  // Une photo déposée une fois doit servir aux deux endroits : sinon on tient
  // deux dossiers à jour et l'un des deux finit par diverger.
  const photos = resolveExamples();
  const frames = resolveHeroFrames();

  if (photos.length > 0) {
    assert.equal(frames.length, photos.length, 'le hero doit reprendre chaque paire');
    for (const frame of frames) {
      assert.ok(frame.before.src, `${frame.id} : photo « avant » attendue`);
      assert.ok(frame.after.src, `${frame.id} : photo « après » attendue`);
    }
  } else {
    assert.ok(frames.every((frame) => frame.before.src === null), 'sans photo, tout est dessiné');
  }
});

test('chaque exemple avant/après désigne une vraie coupe du catalogue', () => {
  for (const pair of EXAMPLE_PAIRS) {
    const item = FALLBACK_CATALOG.find((candidate) => candidate.slug === pair.slug);
    assert.ok(item, `${pair.slug} : absent du catalogue`);
    assert.equal(item?.category, 'cut', `${pair.slug} : les exemples montrent des coupes`);
  }
});

test('une paire d’exemple n’est jamais affichée à moitié', () => {
  // Un « avant » sans « après » ne prouve rien et donne un cadre vide à côté
  // d'une photo. Les deux fichiers, ou rien.
  for (const pair of resolveExamples()) {
    assert.ok(pair.before, `${pair.label} : « avant » manquant`);
    assert.ok(pair.after, `${pair.label} : « après » manquant`);
  }
});

test('aucune route ne laisse un non-payeur consommer quoi que ce soit', () => {
  // Le paywall vivait sur les pages seulement. Un compte inscrit sans
  // abonnement pouvait appeler /api/uploads directement et remplir le
  // stockage : la porte doit être sur la route, pas sur l'écran.
  const uploads = readFileSync(join(process.cwd(), 'app/api/uploads/route.ts'), 'utf8');
  assert.ok(uploads.includes('hasPaidAccess'), '/api/uploads : paiement non vérifié');

  const paywall = readFileSync(join(process.cwd(), 'lib/paywall.ts'), 'utf8');
  assert.ok(paywall.includes('hasPaidAccess'), 'requirePaidAccess ne vérifie plus le paiement');

  for (const page of [
    'app/(app)/app/generation/page.tsx',
    'app/(app)/app/resultat/page.tsx',
    'app/onboarding/photo/page.tsx',
    'app/onboarding/generation/page.tsx',
    'app/onboarding/resultat/page.tsx',
  ]) {
    const source = readFileSync(join(process.cwd(), page), 'utf8');
    assert.ok(source.includes('requirePaidAccess'), `${page} : page ouverte sans abonnement`);
  }
});

test('une seule image part au modèle, jamais une photo d’exemple', () => {
  // Régression vue en production : une demande de crâne rasé a rendu le visage
  // du modèle de référence collé sur la photo du client. La variante
  // multi-images compose les visages qu'on lui donne, elle ne sait pas traiter
  // le second comme un exemple. Aucune consigne écrite ne l'en empêche.
  const provider = readFileSync(join(process.cwd(), 'lib/ai/provider.ts'), 'utf8');
  const route = readFileSync(join(process.cwd(), 'app/api/generations/route.ts'), 'utf8');

  assert.ok(!provider.includes('image_urls'), 'provider : envoi multi-images interdit');
  assert.ok(!provider.includes('kontext/max/multi'), 'provider : endpoint multi-images interdit');
  assert.ok(!provider.includes('FAL_MODEL_MULTI'), 'provider : plus de modèle multi-images');
  assert.ok(!provider.includes('referenceUrls'), 'provider : plus de photo de référence');
  assert.ok(!route.includes('referenceUrl'), 'route : plus de photo de référence');
  assert.ok(!route.includes('REFERENCE_CLAUSE'), 'route : plus de clause de référence');
});


// ---------------------------------------------------------------- whop
function signWhop(raw: string, secret: string, id: string, ts: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  return 'v1,' + createHmac('sha256', key).update(`${id}.${ts}.${raw}`).digest('base64');
}

test('une signature Whop valide est acceptée, une falsifiée non', () => {
  const secret = 'whsec_' + Buffer.from('un-secret-de-test-trycut').toString('base64');
  const raw = JSON.stringify({ action: 'payment.succeeded', data: { final_amount: 10 } });
  const id = 'msg_123';
  const now = Date.now();
  const ts = String(Math.floor(now / 1000));

  const headers = { id, timestamp: ts, signature: signWhop(raw, secret, id, ts) };
  assert.equal(verifyWhopSignature(raw, headers, secret, now), true);

  // corps modifié après signature
  assert.equal(
    verifyWhopSignature(raw.replace('10', '9999'), headers, secret, now),
    false,
    'un corps modifié doit être refusé',
  );

  // signature d'un autre secret
  const autre = 'whsec_' + Buffer.from('un-autre-secret-entierement').toString('base64');
  assert.equal(
    verifyWhopSignature(raw, { ...headers, signature: signWhop(raw, autre, id, ts) }, secret, now),
    false,
    'une signature d’un autre secret doit être refusée',
  );

  // rejeu : même signature, mais vieille de deux heures
  assert.equal(
    verifyWhopSignature(raw, headers, secret, now + 2 * 60 * 60 * 1000),
    false,
    'un horodatage périmé doit être refusé',
  );

  // en-têtes manquants
  assert.equal(verifyWhopSignature(raw, { id: null, timestamp: ts, signature: 'x' }, secret, now), false);
});

test('l’email de l’acheteur l’emporte sur les autres adresses', () => {
  const payload = {
    action: 'payment.succeeded',
    data: {
      company: { support_email: 'support@trycutapps.site' },
      user: { email: 'Client@Example.COM' },
    },
  };
  assert.equal(extractEmail(payload), 'client@example.com');
  assert.equal(extractEmail({ data: {} }), null);
});

test('les montants Whop retombent sur la bonne offre', () => {
  // 3 € et 10 €, exprimés en euros comme en centimes
  assert.deepEqual(planForAmount(extractAmountCents({ data: { final_amount: 3 } })), {
    plan: 'pack',
    credits: 5,
  });
  assert.deepEqual(planForAmount(extractAmountCents({ data: { final_amount: 1000 } })), {
    plan: 'pass',
    credits: 23,
  });
  // un montant inconnu ne crédite rien plutôt que de créditer au hasard
  assert.equal(planForAmount(extractAmountCents({ data: { final_amount: 7.5 } })), null);
  assert.equal(planForAmount(null), null);
});

test('les offres affichées correspondent aux montants encaissés', () => {
  for (const plan of PRICING) {
    if (plan.id === 'free') continue;
    const cents = Number(plan.price.replace(/[^0-9,]/g, '').replace(',', '.')) * 100;
    const mapped = PLAN_BY_AMOUNT_CENTS[cents];
    assert.ok(mapped, `${plan.name} : le prix affiché ${plan.price} n’est mappé à aucune offre`);
    assert.equal(mapped?.plan, plan.id, `${plan.name} : mauvaise offre`);
    assert.equal(
      mapped?.credits,
      plan.credits,
      `${plan.name} : ${plan.credits} coupes affichées mais ${mapped?.credits} créditées`,
    );
  }
});

test('le lien de paiement emporte l’email du compte', () => {
  const link = withCheckoutReference(
    'https://whop.com/checkout/plan_FqNwkkzr18mMH',
    '11111111-2222-3333-4444-555555555555',
    'client@example.com',
  );
  assert.ok(link.includes('email=client%40example.com'), 'email absent du lien');
  assert.ok(link.includes('11111111-2222-3333-4444-555555555555'), 'repère de compte absent');
  assert.ok(link.startsWith('https://whop.com/checkout/plan_'), 'lien de paiement altéré');
});

test('une résiliation ferme l’accès, quel que soit son nom d’événement', () => {
  // Whop nomme l'annulation « went_invalid » dans sa documentation et
  // « deactivated » dans son assistant. Rater un nom, c'est laisser l'accès
  // ouvert à quelqu'un qui a résilié.
  for (const nom of [
    'membership.went_invalid',
    'membership.deactivated',
    'membership.cancelled',
    'payment.failed',
  ]) {
    assert.ok(
      (REVOKING_EVENTS as readonly string[]).includes(nom),
      `${nom} : non écouté, l’accès resterait ouvert`,
    );
  }

  // Un paiement réussi ne doit évidemment jamais fermer l'accès.
  assert.ok(!(REVOKING_EVENTS as readonly string[]).includes('payment.succeeded'));
  assert.ok((GRANTING_EVENTS as readonly string[]).includes('payment.succeeded'));

  // Et l'activation ne crédite pas : seul le paiement crédite, sinon une
  // activation suivie du paiement créditerait deux fois.
  assert.ok(!(GRANTING_EVENTS as readonly string[]).includes('membership.activated'));
});

test('le secret du webhook n’est jamais renvoyé au navigateur', () => {
  // Le champ admin sert à poser le secret, pas à le relire. Le renvoyer, même
  // à un administrateur, le ferait transiter dans une réponse HTTP et vivre
  // dans l'historique du navigateur.
  const route = readFileSync(join(process.cwd(), 'app/api/admin/whop/route.ts'), 'utf8');
  const composant = readFileSync(join(process.cwd(), 'components/admin/WhopSecret.tsx'), 'utf8');

  assert.ok(!route.includes('whop_webhook_secret'), 'la route ne doit jamais lire la colonne');
  assert.ok(route.includes('admin_has_whop_secret'), 'la présence passe par la fonction dédiée');
  assert.ok(route.includes('admin_set_whop_secret'), 'la pose passe par la fonction dédiée');

  // Le champ est en saisie masquée et jamais pré-rempli.
  assert.ok(composant.includes("type=\"password\""), 'le champ doit être masqué');
  assert.ok(!composant.includes('defaultValue'), 'le champ ne doit jamais être pré-rempli');
});

test('un secret Whop au format ws_ est accepté comme un whsec_', () => {
  // Whop délivre un secret préfixé « ws_ », la spécification décrit « whsec_ »
  // suivi d'une clé en base64. Parier sur un seul format ferait rejeter tous
  // les paiements — c'est le bug qui attendait au premier encaissement.
  const raw = JSON.stringify({ action: 'payment.succeeded', data: { final_amount: 3 } });
  const id = 'msg_ws';
  const now = Date.now();
  const ts = String(Math.floor(now / 1000));

  const wsSecret = 'ws_' + 'a'.repeat(65);
  const signeBrut =
    'v1,' + createHmac('sha256', Buffer.from(wsSecret, 'utf8')).update(`${id}.${ts}.${raw}`).digest('base64');
  assert.equal(
    verifyWhopSignature(raw, { id, timestamp: ts, signature: signeBrut }, wsSecret, now),
    true,
    'clé = secret complet en texte',
  );

  const signeSansPrefixe =
    'v1,' +
    createHmac('sha256', Buffer.from(wsSecret.slice(3), 'utf8')).update(`${id}.${ts}.${raw}`).digest('base64');
  assert.equal(
    verifyWhopSignature(raw, { id, timestamp: ts, signature: signeSansPrefixe }, wsSecret, now),
    true,
    'clé = secret sans son préfixe',
  );

  // Élargir les clés candidates ne doit rien laisser passer d'étranger.
  const autre = 'ws_' + 'b'.repeat(65);
  const signeAutre =
    'v1,' + createHmac('sha256', Buffer.from(autre, 'utf8')).update(`${id}.${ts}.${raw}`).digest('base64');
  assert.equal(
    verifyWhopSignature(raw, { id, timestamp: ts, signature: signeAutre }, wsSecret, now),
    false,
    'un secret étranger reste refusé',
  );
});
