-- Seed du catalogue : 43 entrées (16 coupes, 8 colorations, 10 accessoires).
-- GÉNÉRÉ depuis lib/catalog.json — ne pas éditer à la main.
-- Régénérer : node scripts/generate-seed.mjs
-- Descriptions strictement génériques, aucune marque déposée. Rejouable (upsert sur le slug).

insert into public.catalog_items
  (slug, label, category, style_tags, prompt_template, preview_path, is_premium, sort_order)
values
('cut-buzz','Buzz cut','cut',
 array['court','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','sportif','discret'],
 'Give the person a buzz cut: uniform very short clipper cut of even length over the whole head, natural hairline.',
 '/reference/cut-buzz.jpg', false, 10),

('cut-chauve','Crâne rasé','cut',
 array['rase','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','discret'],
 'Shave the person completely bald: smooth clean scalp with no hair at all, natural skin tone and shine on the scalp.',
 '/reference/cut-chauve.jpg', false, 20),

('cut-degrade-espagnol','Dégradé espagnol','cut',
 array['court','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','streetwear','remarque'],
 'Give the person a Spanish style fade haircut: skin fade on the sides and back, sharp defined line up at the temples and forehead, short textured top with a small straight fringe brought forward over the forehead.',
 '/reference/cut-degrade-espagnol.jpg', false, 30),

('cut-cuenca','Coupe cuenca','cut',
 array['court','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','streetwear','remarque'],
 'Give the person a cuenca haircut: straight hair kept longer on top and swept diagonally forward across the forehead to one side, soft rounded fringe line, tapered faded short sides and back.',
 '/reference/cut-cuenca.jpg', false, 40),

('cut-middle-part','Middle part','cut',
 array['mi-long','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','moderne','soigne'],
 'Give the person a middle part hairstyle: hair of medium length parted straight down the centre, both sides falling symmetrically and framing the forehead, soft natural movement.',
 '/reference/cut-middle-part.jpg', false, 50),

('cut-lisse-cote','Lissé sur le côté','cut',
 array['court','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','mi-long','classique','soigne'],
 'Give the person straight hair combed flat to one side: sleek smooth lengths with a clean side parting, no volume on top, tidy finish.',
 '/reference/cut-lisse-cote.jpg', false, 60),

('cut-permanente-courte','Cheveux bouclés','cut',
 array['allonge','boucles','carre','court','crepus','moderne','ondules','ovale','raides','rond'],
 'Give the person a short men''s perm: loose well defined curls about 4 cm long on top, falling slightly over the forehead, short tapered faded sides and back, natural springy curl pattern with visible separated curls.',
 '/reference/cut-permanente-courte.jpg', false, 70),

('cut-permanente-mi-longue','Cheveux bouclés mi-longs','cut',
 array['allonge','boucles','carre','crepus','mi-long','moderne','ondules','ovale','raides','rond'],
 'Give the person a medium length men''s perm: loose well defined curls about 8 cm long with full volume on top, curls falling over the forehead and covering the top of the ears, short tapered sides, natural springy separated curls.',
 '/reference/cut-permanente-mi-longue.jpg', false, 80),

('cut-permanente-longue','Cheveux bouclés longs','cut',
 array['allonge','boucles','carre','crepus','long','moderne','ondules','ovale','raides','rond'],
 'Give the person a long perm: loose well defined curls falling to the shoulders, abundant volume all around the head, natural springy separated curl pattern.',
 '/reference/cut-permanente-longue.jpg', false, 90),

('cut-afro-court','Afro court','cut',
 array['court','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','crepus','soigne'],
 'Give the person a short afro: even short natural coily hair over the whole head with a sharp lined up hairline at the forehead and temples.',
 '/reference/cut-afro-court.jpg', false, 100),

('cut-afro-mi-long','Afro mi-long','cut',
 array['mi-long','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','crepus','remarque'],
 'Give the person a medium length afro: rounded voluminous natural coily hair standing out from the head, even shape, sharp lined up hairline.',
 '/reference/cut-afro-mi-long.jpg', false, 110),

('cut-locks','Locks','cut',
 array['mi-long','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','crepus','streetwear'],
 'Give the person dreadlocks: even cylindrical locs of shoulder length distributed over the whole head, neat parted roots.',
 '/reference/cut-locks.jpg', false, 120),

('cut-tresses','Tresses','cut',
 array['mi-long','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','crepus','streetwear'],
 'Give the person braided hair: parallel cornrow braids laid flat along the scalp from the forehead to the nape, clean straight partings between them.',
 '/reference/cut-tresses.jpg', false, 130),

('cut-cheveux-longs','Cheveux longs','cut',
 array['long','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','remarque'],
 'Give the person long hair reaching well below the shoulders, worn loose with natural movement and a soft centre parting.',
 '/reference/cut-cheveux-longs.jpg', false, 140),

('cut-long-attache','Cheveux longs attachés','cut',
 array['long','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','soigne'],
 'Give the person long hair tied back into a bun at the back of the head, smooth pulled back lengths, clean hairline at the forehead.',
 '/reference/cut-long-attache.jpg', false, 150),

('cut-long-attache-boucle','Cheveux longs attachés bouclés','cut',
 array['long','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','boucles','soigne'],
 'Give the person long curly hair tied back into a bun at the back of the head, curls visible around the hairline and in the bun.',
 '/reference/cut-long-attache-boucle.jpg', false, 160),

('color-platine','Platine','color',
 array['couleur','raides','ondules','boucles','crepus','streetwear','remarque'],
 'Recolour the person''s hair to cool platinum blonde, uniform from roots to ends.',
 '/reference/color-platine.jpg', false, 210),

('color-cendre','Cendré','color',
 array['couleur','raides','ondules','boucles','soigne','modere'],
 'Recolour the person''s hair to cool ash blonde with no golden tones.',
 '/reference/color-cendre.jpg', false, 220),

('color-caramel','Caramel','color',
 array['couleur','raides','ondules','boucles','crepus','classique','modere'],
 'Recolour the person''s hair to warm caramel brown with subtle golden highlights.',
 '/reference/color-caramel.jpg', false, 230),

('color-meches','Mèches éclaircies','color',
 array['couleur','raides','ondules','boucles','streetwear','modere','remarque'],
 'Recolour the person''s hair to fine lightened highlights through the top, keeping the base darker.',
 '/reference/color-meches.jpg', false, 240),

('color-blond-miel','Blond miel','color',
 array['couleur','raides','ondules','boucles','classique','soigne','modere'],
 'Recolour the person''s hair to uniform warm honey blonde.',
 '/reference/color-blond-miel.jpg', false, 250),

('color-chatain-froid','Châtain froid','color',
 array['couleur','raides','ondules','boucles','crepus','classique','soigne','discret'],
 'Recolour the person''s hair to deep cool brown with no red tones.',
 '/reference/color-chatain-froid.jpg', false, 260),

('color-noir-intense','Noir intense','color',
 array['couleur','raides','ondules','boucles','crepus','classique','soigne','discret'],
 'Recolour the person''s hair to deep uniform black with natural shine.',
 '/reference/color-noir-intense.jpg', false, 270),

('color-roux-cuivre','Roux cuivré','color',
 array['couleur','raides','ondules','boucles','streetwear','remarque'],
 'Recolour the person''s hair to saturated copper red.',
 '/reference/color-roux-cuivre.jpg', true, 280),

('beard-rase','Rasé de près','beard',
 array['rase','discret','soigne'],
 'Remove the person''s facial hair completely: clean shaven face with smooth skin, no stubble.',
 '/reference/beard-rase.jpg', false, 300),

('beard-trois-jours','Barbe de trois jours','beard',
 array['court','discret','moderne'],
 'Give the person light three day stubble evenly covering the jaw, chin and upper lip, short and natural.',
 '/reference/beard-trois-jours.jpg', false, 310),

('beard-courte','Barbe courte taillée','beard',
 array['court','soigne','classique'],
 'Give the person a short trimmed beard: even short length along the jaw and chin, clean defined cheek line and neckline.',
 '/reference/beard-courte.jpg', false, 320),

('beard-fournie','Barbe fournie','beard',
 array['mi-long','remarque','classique'],
 'Give the person a full thick beard covering the jaw, chin and cheeks, dense and well groomed, natural shape.',
 '/reference/beard-fournie.jpg', false, 330),

('beard-longue','Barbe longue','beard',
 array['long','remarque'],
 'Give the person a long beard falling below the chin, dense and well groomed, natural shape and texture.',
 '/reference/beard-longue.jpg', false, 340),

('beard-bouc','Bouc','beard',
 array['court','moderne'],
 'Give the person a goatee: hair on the chin only, cheeks and jaw clean shaven, neatly trimmed outline.',
 '/reference/beard-bouc.jpg', false, 350),

('beard-moustache','Moustache','beard',
 array['court','remarque'],
 'Give the person a moustache only: hair on the upper lip, chin and cheeks completely clean shaven.',
 '/reference/beard-moustache.jpg', false, 360),

('beard-bouc-moustache','Bouc et moustache','beard',
 array['court','moderne','soigne'],
 'Give the person a circle beard: a moustache joined to a chin goatee forming a closed circle around the mouth, cheeks clean shaven.',
 '/reference/beard-bouc-moustache.jpg', false, 370),

('beard-collier','Barbe collier','beard',
 array['court','soigne'],
 'Give the person a chinstrap beard: a thin even line of beard following the jawline from ear to ear, cheeks and chin otherwise clean shaven.',
 '/reference/beard-collier.jpg', false, 380),

('acc-chaine-maille','Chaîne maille épaisse','accessory',
 array['chaines','streetwear','remarque','modere'],
 'Add a thick silver curb link chain necklace resting on the chest.',
 '/reference/acc-chaine-maille.jpg', false, 400),

('acc-chaine-pendentif','Chaîne à pendentif','accessory',
 array['chaines','streetwear','modere','remarque'],
 'Add a medium silver chain with a simple geometric pendant.',
 '/reference/acc-chaine-pendentif.jpg', false, 410),

('acc-double-chaine','Double chaîne','accessory',
 array['chaines','streetwear','remarque'],
 'Add two layered silver chains of different lengths.',
 '/reference/acc-double-chaine.jpg', true, 420),

('acc-creole-fine','Créole fine','accessory',
 array['boucles','streetwear','modere','soigne'],
 'Add a small thin silver hoop earring on the visible ear.',
 '/reference/acc-creole-fine.jpg', false, 430),

('acc-puce-discrete','Puce discrète','accessory',
 array['boucles','discret','soigne','classique'],
 'Add a small discreet stud earring on the visible ear.',
 '/reference/acc-puce-discrete.jpg', false, 440),

('acc-anneau-epais','Anneau épais','accessory',
 array['boucles','streetwear','remarque'],
 'Add a thick silver hoop earring on the visible ear.',
 '/reference/acc-anneau-epais.jpg', true, 450),

('acc-grillz-simple','Grillz une dent','accessory',
 array['grillz','streetwear','modere'],
 'Add a metallic tooth cap on a single tooth, visible only if the mouth is open.',
 '/reference/acc-grillz-simple.jpg', false, 460),

('acc-grillz-bas','Grillz rangée basse','accessory',
 array['grillz','streetwear','remarque'],
 'Add metallic grillz on the lower row of teeth, visible only if the mouth is open.',
 '/reference/acc-grillz-bas.jpg', true, 470),

('acc-grillz-complet','Grillz complet','accessory',
 array['grillz','streetwear','remarque'],
 'Add metallic grillz on both rows of teeth, visible only if the mouth is open.',
 '/reference/acc-grillz-complet.jpg', true, 480),

('acc-chaine-fine','Chaîne fine','accessory',
 array['chaines','discret','modere','soigne','classique'],
 'Add a thin silver chain necklace worn close to the neck, subtle shine.',
 '/reference/acc-chaine-fine.jpg', false, 490)

on conflict (slug) do update set
  label = excluded.label,
  category = excluded.category,
  style_tags = excluded.style_tags,
  prompt_template = excluded.prompt_template,
  preview_path = excluded.preview_path,
  is_premium = excluded.is_premium,
  sort_order = excluded.sort_order;
