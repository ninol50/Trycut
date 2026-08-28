-- Seed du catalogue : 38 entrées (20 coupes, 8 colorations, 10 accessoires).
-- GÉNÉRÉ depuis lib/catalog-data.ts — ne pas éditer à la main.
-- Régénérer : node scripts/generate-seed.mjs
-- Descriptions strictement génériques, aucune marque déposée. Rejouable (upsert sur le slug).

insert into public.catalog_items
  (slug, label, category, style_tags, prompt_template, preview_path, is_premium, sort_order)
values
('cut-fade-bas','Dégradé bas','cut',
 array['court','raides','ondules','boucles','crepus','ovale','rond','carre','allonge','classique','soigne','sportif','discret','modere'],
 'Coiffure : dégradé bas net, longueur conservée sur le dessus, transition progressive au-dessus des oreilles. Texture de cheveux {{texture}}, longueur de départ {{length}}, barbe {{beard}}. Conserve strictement le visage, l''angle de prise de vue et l''éclairage d''origine.',
 '/demo/catalog/cut-fade-bas.jpg', false, 10),

('cut-fade-haut','Dégradé haut','cut',
 array['court','raides','ondules','boucles','crepus','ovale','carre','allonge','streetwear','sportif','modere','remarque'],
 'Coiffure : dégradé haut marqué, contraste net entre les côtés très courts et le dessus. Texture {{texture}}, longueur de départ {{length}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-fade-haut.jpg', false, 20),

('cut-fade-mid','Dégradé mi-hauteur','cut',
 array['court','raides','ondules','boucles','crepus','ovale','rond','carre','classique','soigne','modere'],
 'Coiffure : dégradé à mi-hauteur, équilibré, dessus travaillé vers l''avant. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-fade-mid.jpg', false, 30),

('cut-buzz','Coupe très courte à la tondeuse','cut',
 array['rase','court','raides','ondules','boucles','crepus','ovale','carre','sportif','streetwear','remarque'],
 'Coiffure : coupe uniforme très courte à la tondeuse, longueur régulière sur tout le crâne. Barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-buzz.jpg', false, 40),

('cut-crop-francais','Crop français','cut',
 array['court','raides','ondules','ovale','allonge','carre','streetwear','soigne','modere'],
 'Coiffure : frange courte droite texturée sur le front, côtés dégradés courts. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-crop-francais.jpg', false, 50),

('cut-mi-long-texture','Mi-long texturé','cut',
 array['mi-long','long','raides','ondules','boucles','ovale','carre','allonge','classique','soigne','modere'],
 'Coiffure : longueur mi-longue, mèches texturées à l''effilage, mouvement naturel vers l''arrière. Texture {{texture}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-mi-long-texture.jpg', false, 60),

('cut-boucle-degage','Coupe bouclée dégagée','cut',
 array['court','mi-long','boucles','crepus','ondules','rond','ovale','carre','streetwear','soigne','modere'],
 'Coiffure : boucles conservées et définies sur le dessus, côtés dégagés courts. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve la définition naturelle des boucles, le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-boucle-degage.jpg', false, 70),

('cut-afro-court','Afro court net','cut',
 array['court','crepus','boucles','rond','carre','ovale','classique','soigne','discret','modere'],
 'Coiffure : afro court de longueur régulière, contours nets au niveau du front et des tempes. Texture {{texture}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-afro-court.jpg', false, 80),

('cut-twists-courtes','Twists courtes','cut',
 array['court','mi-long','crepus','boucles','ovale','rond','allonge','streetwear','remarque'],
 'Coiffure : petites torsades régulières réparties sur l''ensemble du crâne. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-twists-courtes.jpg', false, 90),

('cut-undercut-raie','Undercut à raie marquée','cut',
 array['court','mi-long','raides','ondules','ovale','allonge','carre','classique','soigne','modere'],
 'Coiffure : côtés rasés courts, dessus long peigné sur le côté avec une raie nette. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-undercut-raie.jpg', false, 100),

('cut-carre-effile','Carré effilé mi-long','cut',
 array['mi-long','raides','ondules','ovale','allonge','soigne','modere'],
 'Coiffure : longueur au niveau de la mâchoire, pointes effilées, volume maîtrisé. Texture {{texture}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-carre-effile.jpg', false, 110),

('cut-long-ondule','Long ondulé','cut',
 array['long','mi-long','ondules','boucles','raides','ovale','carre','streetwear','remarque'],
 'Coiffure : cheveux longs jusqu''aux épaules, ondulations naturelles, raie centrale souple. Texture {{texture}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-long-ondule.jpg', false, 120),

('cut-degrade-couches','Dégradé en couches','cut',
 array['mi-long','long','ondules','raides','boucles','rond','ovale','streetwear','remarque'],
 'Coiffure : couches superposées, volume marqué sur le dessus, longueurs plus légères en pointes. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-degrade-couches.jpg', true, 130),

('cut-blowout-texture','Blowout texturé','cut',
 array['court','mi-long','ondules','boucles','crepus','ovale','allonge','streetwear','sportif','remarque'],
 'Coiffure : volume brossé vers le haut et l''arrière, côtés courts, pointes texturées. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-blowout-texture.jpg', true, 140),

('cut-brosse-courte','Brosse courte','cut',
 array['court','rase','raides','ondules','carre','ovale','sportif','classique','discret'],
 'Coiffure : dessus court coupé droit en brosse, côtés courts réguliers. Texture {{texture}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-brosse-courte.jpg', false, 150),

('cut-bol-moderne','Coupe au bol revisitée','cut',
 array['court','mi-long','raides','ondules','boucles','ovale','allonge','streetwear','remarque'],
 'Coiffure : ligne de coupe circulaire nette sur le dessus, nuque et tempes dégagées. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-bol-moderne.jpg', true, 160),

('cut-tresses-plaquees','Tresses plaquées','cut',
 array['court','mi-long','crepus','boucles','ovale','rond','allonge','streetwear','remarque'],
 'Coiffure : tresses plaquées parallèles suivant la forme du crâne, raies nettes. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-tresses-plaquees.jpg', true, 170),

('cut-locks-courtes','Locks courtes','cut',
 array['court','mi-long','crepus','boucles','ovale','carre','streetwear','modere','remarque'],
 'Coiffure : locks courtes régulières réparties sur le crâne, pointes nettes. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-locks-courtes.jpg', true, 180),

('cut-nuque-longue','Nuque longue, côtés courts','cut',
 array['mi-long','court','raides','ondules','boucles','ovale','carre','streetwear','remarque'],
 'Coiffure : côtés et dessus courts, longueur conservée uniquement sur la nuque. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-nuque-longue.jpg', false, 190),

('cut-frange-texturee','Frange texturée','cut',
 array['court','mi-long','raides','ondules','allonge','ovale','soigne','streetwear','modere'],
 'Coiffure : frange souple retombant sur le front, longueurs texturées sur les côtés. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l''angle et l''éclairage.',
 '/demo/catalog/cut-frange-texturee.jpg', false, 200),

('color-platine','Platine','color',
 array['couleur','raides','ondules','boucles','crepus','streetwear','remarque'],
 'Coloration : blond platine froid uniforme sur l''ensemble de la chevelure, racines incluses. Conserve la coupe existante, la texture {{texture}}, le visage, l''angle et l''éclairage.',
 '/demo/catalog/color-platine.jpg', false, 210),

('color-cendre','Cendré','color',
 array['couleur','raides','ondules','boucles','soigne','modere'],
 'Coloration : blond cendré froid sans reflet doré. Conserve la coupe, la texture {{texture}}, le visage, l''angle et l''éclairage.',
 '/demo/catalog/color-cendre.jpg', false, 220),

('color-caramel','Caramel','color',
 array['couleur','raides','ondules','boucles','crepus','classique','modere'],
 'Coloration : châtain caramel chaud, reflets dorés discrets. Conserve la coupe, la texture {{texture}}, le visage, l''angle et l''éclairage.',
 '/demo/catalog/color-caramel.jpg', false, 230),

('color-meches','Mèches éclaircies','color',
 array['couleur','raides','ondules','boucles','streetwear','modere','remarque'],
 'Coloration : mèches éclaircies fines réparties sur le dessus, base conservée plus foncée. Conserve la coupe, la texture {{texture}}, le visage, l''angle et l''éclairage.',
 '/demo/catalog/color-meches.jpg', false, 240),

('color-blond-miel','Blond miel','color',
 array['couleur','raides','ondules','boucles','classique','soigne','modere'],
 'Coloration : blond miel chaud uniforme. Conserve la coupe, la texture {{texture}}, le visage, l''angle et l''éclairage.',
 '/demo/catalog/color-blond-miel.jpg', false, 250),

('color-chatain-froid','Châtain froid','color',
 array['couleur','raides','ondules','boucles','crepus','classique','soigne','discret'],
 'Coloration : châtain froid profond, sans reflet roux. Conserve la coupe, la texture {{texture}}, le visage, l''angle et l''éclairage.',
 '/demo/catalog/color-chatain-froid.jpg', false, 260),

('color-noir-intense','Noir intense','color',
 array['couleur','raides','ondules','boucles','crepus','classique','soigne','discret'],
 'Coloration : noir profond uniforme, brillance naturelle. Conserve la coupe, la texture {{texture}}, le visage, l''angle et l''éclairage.',
 '/demo/catalog/color-noir-intense.jpg', false, 270),

('color-roux-cuivre','Roux cuivré','color',
 array['couleur','raides','ondules','boucles','streetwear','remarque'],
 'Coloration : roux cuivré saturé sur l''ensemble de la chevelure. Conserve la coupe, la texture {{texture}}, le visage, l''angle et l''éclairage.',
 '/demo/catalog/color-roux-cuivre.jpg', true, 280),

('acc-chaine-fine','Chaîne fine','accessory',
 array['chaines','discret','modere','soigne','classique'],
 'Accessoire : chaîne fine en métal argenté portée au ras du cou, reflets discrets. Conserve la coiffure, le visage, l''angle, la tenue et l''éclairage.',
 '/demo/catalog/acc-chaine-fine.jpg', false, 290),

('acc-chaine-maille','Chaîne maille épaisse','accessory',
 array['chaines','streetwear','remarque','modere'],
 'Accessoire : chaîne à maille épaisse en métal argenté portée sur le buste. Conserve la coiffure, le visage, l''angle, la tenue et l''éclairage.',
 '/demo/catalog/acc-chaine-maille.jpg', false, 300),

('acc-chaine-pendentif','Chaîne à pendentif','accessory',
 array['chaines','streetwear','modere','remarque'],
 'Accessoire : chaîne moyenne avec un pendentif géométrique sobre. Conserve la coiffure, le visage, l''angle, la tenue et l''éclairage.',
 '/demo/catalog/acc-chaine-pendentif.jpg', false, 310),

('acc-double-chaine','Double chaîne','accessory',
 array['chaines','streetwear','remarque'],
 'Accessoire : deux chaînes superposées de longueurs différentes en métal argenté. Conserve la coiffure, le visage, l''angle, la tenue et l''éclairage.',
 '/demo/catalog/acc-double-chaine.jpg', true, 320),

('acc-creole-fine','Créole fine','accessory',
 array['boucles','streetwear','modere','soigne'],
 'Accessoire : petite créole fine en métal argenté à l''oreille visible. Conserve la coiffure, le visage, l''angle et l''éclairage.',
 '/demo/catalog/acc-creole-fine.jpg', false, 330),

('acc-puce-discrete','Puce discrète','accessory',
 array['boucles','discret','soigne','classique'],
 'Accessoire : puce d''oreille discrète à l''oreille visible. Conserve la coiffure, le visage, l''angle et l''éclairage.',
 '/demo/catalog/acc-puce-discrete.jpg', false, 340),

('acc-anneau-epais','Anneau épais','accessory',
 array['boucles','streetwear','remarque'],
 'Accessoire : anneau d''oreille épais en métal argenté à l''oreille visible. Conserve la coiffure, le visage, l''angle et l''éclairage.',
 '/demo/catalog/acc-anneau-epais.jpg', true, 350),

('acc-grillz-simple','Grillz une dent','accessory',
 array['grillz','streetwear','modere'],
 'Accessoire : habillage dentaire métallique sur une seule dent, visible uniquement si la bouche est ouverte ou souriante. Conserve la coiffure, le visage, l''angle et l''éclairage.',
 '/demo/catalog/acc-grillz-simple.jpg', false, 360),

('acc-grillz-bas','Grillz rangée basse','accessory',
 array['grillz','streetwear','remarque'],
 'Accessoire : habillage dentaire métallique sur la rangée inférieure. Conserve la coiffure, le visage, l''angle et l''éclairage.',
 '/demo/catalog/acc-grillz-bas.jpg', true, 370),

('acc-grillz-complet','Grillz complet','accessory',
 array['grillz','streetwear','remarque'],
 'Accessoire : habillage dentaire métallique sur les deux rangées. Conserve la coiffure, le visage, l''angle et l''éclairage.',
 '/demo/catalog/acc-grillz-complet.jpg', true, 380)

on conflict (slug) do update set
  label = excluded.label,
  category = excluded.category,
  style_tags = excluded.style_tags,
  prompt_template = excluded.prompt_template,
  preview_path = excluded.preview_path,
  is_premium = excluded.is_premium,
  sort_order = excluded.sort_order;
