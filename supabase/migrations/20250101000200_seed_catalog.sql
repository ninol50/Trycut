-- Seed du catalogue : 38 entrées (20 coupes, 8 colorations, 10 accessoires).
-- GÉNÉRÉ depuis lib/catalog.json — ne pas éditer à la main.
-- Régénérer : node scripts/generate-seed.mjs
-- Descriptions strictement génériques, aucune marque déposée. Rejouable (upsert sur le slug).

insert into public.catalog_items
  (slug, label, category, style_tags, prompt_template, preview_path, is_premium, sort_order)
values
('cut-fade-bas','Dégradé bas','cut',
 array['court','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','classique','soigne','sportif','discret','modere'],
 'Give the person a clean low fade haircut: hair kept longer on top, tight taper starting just above the ears, smoothly blended transition. Keep the existing hair colour.',
 '/demo/catalog/cut-fade-bas.jpg', false, 10),

('cut-fade-haut','Dégradé haut','cut',
 array['court','raides','ondules','boucles','crepus','ovale','carre','allonge','streetwear','sportif','modere','remarque'],
 'Give the person a high fade haircut: very short sides taken high up the head, strong contrast with the longer styled top. Keep the existing hair colour.',
 '/demo/catalog/cut-fade-haut.jpg', false, 20),

('cut-fade-mid','Dégradé mi-hauteur','cut',
 array['court','raides','ondules','boucles','crepus','ovale','rond','carre','classique','soigne','modere'],
 'Give the person a mid fade haircut: balanced taper at mid height on the sides, top styled forward. Keep the existing hair colour.',
 '/demo/catalog/cut-fade-mid.jpg', false, 30),

('cut-buzz','Coupe très courte à la tondeuse','cut',
 array['rase','court','raides','ondules','boucles','crepus','ovale','carre','sportif','streetwear','remarque'],
 'Give the person a buzz cut: uniform very short clipper cut of even length over the whole head. Keep the existing hair colour.',
 '/demo/catalog/cut-buzz.jpg', false, 40),

('cut-crop-francais','Crop français','cut',
 array['court','raides','ondules','ovale','allonge','carre','streetwear','soigne','modere'],
 'Give the person a French crop: short blunt textured fringe across the forehead, faded short sides. Keep the existing hair colour.',
 '/demo/catalog/cut-crop-francais.jpg', false, 50),

('cut-mi-long-texture','Mi-long texturé','cut',
 array['mi-long','long','raides','ondules','boucles','ovale','carre','allonge','classique','soigne','modere'],
 'Give the person a textured medium length haircut: hair down to the neck, point cut layers, natural movement swept back. Keep the existing hair colour.',
 '/demo/catalog/cut-mi-long-texture.jpg', false, 60),

('cut-boucle-degage','Coupe bouclée dégagée','cut',
 array['court','mi-long','boucles','crepus','ondules','rond','ovale','carre','streetwear','soigne','modere'],
 'Give the person a curly haircut: defined curls kept on top, short tapered sides. Keep the existing hair colour.',
 '/demo/catalog/cut-boucle-degage.jpg', false, 70),

('cut-afro-court','Afro court net','cut',
 array['court','crepus','boucles','rond','carre','ovale','classique','soigne','discret','modere'],
 'Give the person a short afro: even short natural length with a sharp lined up hairline at the forehead and temples. Keep the existing hair colour.',
 '/demo/catalog/cut-afro-court.jpg', false, 80),

('cut-twists-courtes','Twists courtes','cut',
 array['court','mi-long','crepus','boucles','ovale','rond','allonge','streetwear','remarque'],
 'Give the person short two strand twists: small even twists distributed over the whole head. Keep the existing hair colour.',
 '/demo/catalog/cut-twists-courtes.jpg', false, 90),

('cut-undercut-raie','Undercut à raie marquée','cut',
 array['court','mi-long','raides','ondules','ovale','allonge','carre','classique','soigne','modere'],
 'Give the person a disconnected undercut: shaved short sides, long top combed to one side with a sharp hard part. Keep the existing hair colour.',
 '/demo/catalog/cut-undercut-raie.jpg', false, 100),

('cut-carre-effile','Carré effilé mi-long','cut',
 array['mi-long','raides','ondules','ovale','allonge','soigne','modere'],
 'Give the person a jaw length tapered bob: blunt jawline length with softly thinned ends and controlled volume. Keep the existing hair colour.',
 '/demo/catalog/cut-carre-effile.jpg', false, 110),

('cut-long-ondule','Long ondulé','cut',
 array['long','mi-long','ondules','boucles','raides','ovale','carre','streetwear','remarque'],
 'Give the person long wavy hair reaching the shoulders, natural waves, soft centre parting. Keep the existing hair colour.',
 '/demo/catalog/cut-long-ondule.jpg', false, 120),

('cut-degrade-couches','Dégradé en couches','cut',
 array['mi-long','long','ondules','raides','boucles','rond','ovale','streetwear','remarque'],
 'Give the person a layered haircut: stacked layers, marked volume on top, lighter thinned ends. Keep the existing hair colour.',
 '/demo/catalog/cut-degrade-couches.jpg', true, 130),

('cut-blowout-texture','Blowout texturé','cut',
 array['court','mi-long','ondules','boucles','crepus','ovale','allonge','streetwear','sportif','remarque'],
 'Give the person a textured blowout: hair brushed up and back with volume, short sides, textured ends. Keep the existing hair colour.',
 '/demo/catalog/cut-blowout-texture.jpg', true, 140),

('cut-brosse-courte','Brosse courte','cut',
 array['court','rase','raides','ondules','carre','ovale','sportif','classique','discret'],
 'Give the person a short brush cut: top cut straight and short like a flat top, evenly short sides. Keep the existing hair colour.',
 '/demo/catalog/cut-brosse-courte.jpg', false, 150),

('cut-bol-moderne','Coupe au bol revisitée','cut',
 array['court','mi-long','raides','ondules','boucles','ovale','allonge','streetwear','remarque'],
 'Give the person a modern bowl cut: clean circular cutting line on top, cleared nape and temples. Keep the existing hair colour.',
 '/demo/catalog/cut-bol-moderne.jpg', true, 160),

('cut-tresses-plaquees','Tresses plaquées','cut',
 array['court','mi-long','crepus','boucles','ovale','rond','allonge','streetwear','remarque'],
 'Give the person cornrows: parallel braids laid flat along the scalp with clean straight partings. Keep the existing hair colour.',
 '/demo/catalog/cut-tresses-plaquees.jpg', true, 170),

('cut-locks-courtes','Locks courtes','cut',
 array['court','mi-long','crepus','boucles','ovale','carre','streetwear','modere','remarque'],
 'Give the person short dreadlocks: even short locs distributed over the head with neat ends. Keep the existing hair colour.',
 '/demo/catalog/cut-locks-courtes.jpg', true, 180),

('cut-nuque-longue','Nuque longue, côtés courts','cut',
 array['mi-long','court','raides','ondules','boucles','ovale','carre','streetwear','remarque'],
 'Give the person a mullet: short sides and top, length kept only at the nape. Keep the existing hair colour.',
 '/demo/catalog/cut-nuque-longue.jpg', false, 190),

('cut-frange-texturee','Frange texturée','cut',
 array['court','mi-long','raides','ondules','allonge','ovale','soigne','streetwear','modere'],
 'Give the person a textured fringe falling softly over the forehead, textured lengths at the sides. Keep the existing hair colour.',
 '/demo/catalog/cut-frange-texturee.jpg', false, 200),

('color-platine','Platine','color',
 array['couleur','raides','ondules','boucles','crepus','streetwear','remarque'],
 'Recolour the person''s hair to cool platinum blonde, uniform from roots to ends. Keep the existing haircut, hair length and hairstyle exactly as they are.',
 '/demo/catalog/color-platine.jpg', false, 210),

('color-cendre','Cendré','color',
 array['couleur','raides','ondules','boucles','soigne','modere'],
 'Recolour the person''s hair to cool ash blonde with no golden tones. Keep the existing haircut, hair length and hairstyle exactly as they are.',
 '/demo/catalog/color-cendre.jpg', false, 220),

('color-caramel','Caramel','color',
 array['couleur','raides','ondules','boucles','crepus','classique','modere'],
 'Recolour the person''s hair to warm caramel brown with subtle golden highlights. Keep the existing haircut, hair length and hairstyle exactly as they are.',
 '/demo/catalog/color-caramel.jpg', false, 230),

('color-meches','Mèches éclaircies','color',
 array['couleur','raides','ondules','boucles','streetwear','modere','remarque'],
 'Recolour the person''s hair to fine lightened highlights through the top, keeping the base darker. Keep the existing haircut, hair length and hairstyle exactly as they are.',
 '/demo/catalog/color-meches.jpg', false, 240),

('color-blond-miel','Blond miel','color',
 array['couleur','raides','ondules','boucles','classique','soigne','modere'],
 'Recolour the person''s hair to uniform warm honey blonde. Keep the existing haircut, hair length and hairstyle exactly as they are.',
 '/demo/catalog/color-blond-miel.jpg', false, 250),

('color-chatain-froid','Châtain froid','color',
 array['couleur','raides','ondules','boucles','crepus','classique','soigne','discret'],
 'Recolour the person''s hair to deep cool brown with no red tones. Keep the existing haircut, hair length and hairstyle exactly as they are.',
 '/demo/catalog/color-chatain-froid.jpg', false, 260),

('color-noir-intense','Noir intense','color',
 array['couleur','raides','ondules','boucles','crepus','classique','soigne','discret'],
 'Recolour the person''s hair to deep uniform black with natural shine. Keep the existing haircut, hair length and hairstyle exactly as they are.',
 '/demo/catalog/color-noir-intense.jpg', false, 270),

('color-roux-cuivre','Roux cuivré','color',
 array['couleur','raides','ondules','boucles','streetwear','remarque'],
 'Recolour the person''s hair to saturated copper red. Keep the existing haircut, hair length and hairstyle exactly as they are.',
 '/demo/catalog/color-roux-cuivre.jpg', true, 280),

('acc-chaine-fine','Chaîne fine','accessory',
 array['chaines','discret','modere','soigne','classique'],
 'Add a thin silver chain necklace worn close to the neck, subtle shine to the person. Keep the existing hairstyle and hair colour exactly as they are.',
 '/demo/catalog/acc-chaine-fine.jpg', false, 290),

('acc-chaine-maille','Chaîne maille épaisse','accessory',
 array['chaines','streetwear','remarque','modere'],
 'Add a thick silver curb link chain necklace resting on the chest to the person. Keep the existing hairstyle and hair colour exactly as they are.',
 '/demo/catalog/acc-chaine-maille.jpg', false, 300),

('acc-chaine-pendentif','Chaîne à pendentif','accessory',
 array['chaines','streetwear','modere','remarque'],
 'Add a medium silver chain with a simple geometric pendant to the person. Keep the existing hairstyle and hair colour exactly as they are.',
 '/demo/catalog/acc-chaine-pendentif.jpg', false, 310),

('acc-double-chaine','Double chaîne','accessory',
 array['chaines','streetwear','remarque'],
 'Add two layered silver chains of different lengths to the person. Keep the existing hairstyle and hair colour exactly as they are.',
 '/demo/catalog/acc-double-chaine.jpg', true, 320),

('acc-creole-fine','Créole fine','accessory',
 array['boucles','streetwear','modere','soigne'],
 'Add a small thin silver hoop earring on the visible ear to the person. Keep the existing hairstyle and hair colour exactly as they are.',
 '/demo/catalog/acc-creole-fine.jpg', false, 330),

('acc-puce-discrete','Puce discrète','accessory',
 array['boucles','discret','soigne','classique'],
 'Add a small discreet stud earring on the visible ear to the person. Keep the existing hairstyle and hair colour exactly as they are.',
 '/demo/catalog/acc-puce-discrete.jpg', false, 340),

('acc-anneau-epais','Anneau épais','accessory',
 array['boucles','streetwear','remarque'],
 'Add a thick silver hoop earring on the visible ear to the person. Keep the existing hairstyle and hair colour exactly as they are.',
 '/demo/catalog/acc-anneau-epais.jpg', true, 350),

('acc-grillz-simple','Grillz une dent','accessory',
 array['grillz','streetwear','modere'],
 'Add a metallic tooth cap on a single tooth, visible only if the mouth is open to the person. Keep the existing hairstyle and hair colour exactly as they are.',
 '/demo/catalog/acc-grillz-simple.jpg', false, 360),

('acc-grillz-bas','Grillz rangée basse','accessory',
 array['grillz','streetwear','remarque'],
 'Add metallic grillz on the lower row of teeth, visible only if the mouth is open to the person. Keep the existing hairstyle and hair colour exactly as they are.',
 '/demo/catalog/acc-grillz-bas.jpg', true, 370),

('acc-grillz-complet','Grillz complet','accessory',
 array['grillz','streetwear','remarque'],
 'Add metallic grillz on both rows of teeth, visible only if the mouth is open to the person. Keep the existing hairstyle and hair colour exactly as they are.',
 '/demo/catalog/acc-grillz-complet.jpg', true, 380)

on conflict (slug) do update set
  label = excluded.label,
  category = excluded.category,
  style_tags = excluded.style_tags,
  prompt_template = excluded.prompt_template,
  preview_path = excluded.preview_path,
  is_premium = excluded.is_premium,
  sort_order = excluded.sort_order;
