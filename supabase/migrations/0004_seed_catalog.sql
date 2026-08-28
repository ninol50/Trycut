-- ---------------------------------------------------------------------------
-- 0004 — Seed du catalogue : 20 coupes, 8 colorations, 10 accessoires.
--
-- Deux règles tenues ici :
--  - aucun nom de marque déposée, uniquement des descriptions génériques ;
--  - `prompt_template` est un template SERVEUR. Les variables {{…}} sont
--    interpolées dans `src/lib/ai/prompt.ts`, jamais par le client. Le seul
--    champ que le navigateur envoie est un slug de catalogue.
--
-- Vocabulaire des `style_tags` (aligné sur les réponses d'onboarding) :
--   len:shaved|short|mid|long          — écran 2, longueur actuelle
--   tex:straight|wavy|curly|coily      — écran 3, texture
--   hairline:full|slight|receding      — écran 4, ligne de cheveux
--   face:oval|round|square|oblong      — écran 5, forme du visage
--   style:classic|street|sport|neat    — écran 7, style
--   acc:chains|earrings|grillz         — écran 9, accessoires
--   bold:low|mid|high                  — écran 11, niveau d'audace
-- ---------------------------------------------------------------------------

insert into public.catalog_items
  (slug, label, category, style_tags, prompt_template, preview_path, is_premium, sort_order)
values

-- ----------------------------- 20 coupes ----------------------------------

('degrade-bas', 'Dégradé bas', 'cut',
 array['len:short','len:mid','tex:straight','tex:wavy','tex:curly','tex:coily',
       'face:oval','face:round','face:square','style:classic','style:neat','bold:low','hairline:full','hairline:slight'],
 $q$Coupe de cheveux masculine : dégradé bas, transition progressive qui démarre juste au-dessus des oreilles, longueur conservée sur le dessus. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-degrade-bas.jpg', false, 10),

('degrade-haut', 'Dégradé haut', 'cut',
 array['len:short','tex:straight','tex:wavy','tex:curly','tex:coily',
       'face:oval','face:round','style:street','style:sport','bold:mid','hairline:full'],
 $q$Coupe de cheveux masculine : dégradé haut, côtés très courts remontant jusqu'aux tempes, contraste marqué avec le dessus. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-degrade-haut.jpg', false, 20),

('degrade-mi-hauteur', 'Dégradé mi-hauteur', 'cut',
 array['len:short','len:mid','tex:straight','tex:wavy','tex:curly',
       'face:oval','face:square','face:oblong','style:classic','style:sport','bold:mid','hairline:full','hairline:slight'],
 $q$Coupe de cheveux masculine : dégradé démarrant à mi-hauteur du crâne, fondu régulier, dessus laissé libre. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-degrade-mi-hauteur.jpg', false, 30),

('degrade-a-blanc', 'Dégradé à blanc', 'cut',
 array['len:shaved','len:short','tex:straight','tex:wavy','tex:curly','tex:coily',
       'face:oval','face:square','style:street','style:sport','bold:high','hairline:slight','hairline:receding'],
 $q$Coupe de cheveux masculine : dégradé descendant jusqu'au rasé net sur les contours, transition très nette, dessus court. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-degrade-a-blanc.jpg', false, 40),

('buzz-cut', 'Coupe rasée uniforme', 'cut',
 array['len:shaved','len:short','tex:straight','tex:wavy','tex:curly','tex:coily',
       'face:oval','face:square','style:sport','style:street','bold:high','hairline:slight','hairline:receding'],
 $q$Coupe de cheveux masculine : rasage uniforme à la tondeuse sur l'ensemble du crâne, longueur régulière très courte, ligne frontale naturelle. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-buzz-cut.jpg', false, 50),

('crop-francais', 'Crop français texturé', 'cut',
 array['len:short','tex:straight','tex:wavy',
       'face:oval','face:oblong','face:square','style:street','style:neat','bold:mid','hairline:receding','hairline:slight'],
 $q$Coupe de cheveux masculine : dessus court et texturé ramené vers l'avant en frange courte et irrégulière, côtés dégradés. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-crop-francais.jpg', false, 60),

('mi-long-texture', 'Mi-long texturé', 'cut',
 array['len:mid','len:long','tex:straight','tex:wavy',
       'face:oval','face:round','face:square','style:street','style:classic','bold:mid','hairline:full'],
 $q$Coupe de cheveux masculine : longueur mi-longue arrivant à la nuque, mèches texturées et mouvement naturel, volume désordonné maîtrisé. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-mi-long-texture.jpg', false, 70),

('coupe-brosse', 'Coupe brosse', 'cut',
 array['len:short','tex:straight','tex:coily',
       'face:oval','face:oblong','style:classic','style:sport','bold:mid','hairline:full'],
 $q$Coupe de cheveux masculine : dessus coupé droit et dressé à la verticale, côtés courts, ligne supérieure plate et régulière. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-coupe-brosse.jpg', false, 80),

('boucles-degagees', 'Boucles dégagées sur les côtés', 'cut',
 array['len:short','len:mid','tex:curly','tex:wavy',
       'face:oval','face:square','face:oblong','style:street','style:neat','bold:mid','hairline:full'],
 $q$Coupe de cheveux masculine : boucles conservées et allégées sur le dessus, côtés dégagés en dégradé progressif, définition des boucles visible. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-boucles-degagees.jpg', false, 90),

('boucles-longues', 'Boucles longues libres', 'cut',
 array['len:mid','len:long','tex:curly','tex:coily',
       'face:oval','face:square','style:street','bold:high','hairline:full'],
 $q$Coupe de cheveux masculine : boucles longues laissées libres, volume important et retombant, pointes définies. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-boucles-longues.jpg', false, 100),

('afro-court', 'Afro court net', 'cut',
 array['len:short','len:mid','tex:coily','tex:curly',
       'face:oval','face:round','face:square','style:classic','style:neat','bold:low','hairline:full'],
 $q$Coupe de cheveux masculine : volume crépu court et régulier sur l'ensemble du crâne, contours nets et ligne frontale dessinée. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-afro-court.jpg', false, 110),

('twists-courtes', 'Twists courtes', 'cut',
 array['len:short','len:mid','tex:coily',
       'face:oval','face:round','style:street','bold:high','hairline:full'],
 $q$Coupe de cheveux masculine : cheveux crépus vrillés en petites torsades courtes et régulières, réparties uniformément. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-twists-courtes.jpg', true, 120),

('ondule-mi-long', 'Ondulé mi-long', 'cut',
 array['len:mid','tex:wavy','tex:straight',
       'face:oval','face:oblong','face:square','style:classic','style:neat','bold:low','hairline:full'],
 $q$Coupe de cheveux masculine : ondulations souples de longueur moyenne, mouvement latéral naturel, pointes effilées. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-ondule-mi-long.jpg', false, 130),

('raie-sur-le-cote', 'Raie sur le côté', 'cut',
 array['len:short','len:mid','tex:straight','tex:wavy',
       'face:oval','face:round','face:square','style:classic','style:neat','bold:low','hairline:slight'],
 $q$Coupe de cheveux masculine : raie latérale marquée, dessus peigné sur le côté, côtés courts et nets, finition soignée. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-raie-sur-le-cote.jpg', false, 140),

('coiffe-en-arriere', 'Cheveux coiffés en arrière', 'cut',
 array['len:mid','len:long','tex:straight','tex:wavy',
       'face:oval','face:round','style:classic','style:neat','bold:mid','hairline:full','hairline:slight'],
 $q$Coupe de cheveux masculine : dessus de longueur moyenne ramené vers l'arrière avec du volume à la racine, côtés courts et nets. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-coiffe-en-arriere.jpg', false, 150),

('frange-texturee', 'Frange texturée', 'cut',
 array['len:short','len:mid','tex:straight','tex:wavy',
       'face:oblong','face:square','style:street','style:neat','bold:mid','hairline:receding','hairline:slight'],
 $q$Coupe de cheveux masculine : frange droite et texturée retombant sur le front, longueur uniforme sur le dessus, côtés courts. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-frange-texturee.jpg', false, 160),

('undercut-deconnecte', 'Undercut déconnecté', 'cut',
 array['len:mid','len:long','tex:straight','tex:wavy','tex:curly',
       'face:oval','face:round','style:street','bold:high','hairline:full'],
 $q$Coupe de cheveux masculine : côtés et nuque rasés courts sans dégradé, rupture nette avec un dessus long laissé intact. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-undercut-deconnecte.jpg', false, 170),

('long-uniforme', 'Long uniforme', 'cut',
 array['len:long','len:mid','tex:straight','tex:wavy',
       'face:oval','face:square','style:street','style:classic','bold:high','hairline:full'],
 $q$Coupe de cheveux masculine : longueur uniforme descendant sous les épaules, retombé naturel, pointes régulières. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-long-uniforme.jpg', true, 180),

('nuque-longue-moderne', 'Nuque longue moderne', 'cut',
 array['len:mid','len:long','tex:straight','tex:wavy','tex:curly',
       'face:oval','face:oblong','style:street','bold:high','hairline:full'],
 $q$Coupe de cheveux masculine : dessus et côtés courts, longueur conservée uniquement sur la nuque, transition assumée. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-nuque-longue-moderne.jpg', true, 190),

('contours-dessines', 'Rasé avec contours dessinés', 'cut',
 array['len:shaved','len:short','tex:coily','tex:curly','tex:straight',
       'face:oval','face:round','face:square','style:street','style:sport','bold:high','hairline:slight','hairline:receding'],
 $q$Coupe de cheveux masculine : cheveux très courts avec contours frontaux et temporaux redessinés au rasoir, lignes droites et nettes. Texture des cheveux : {{texture}}. Forme du visage : {{face_shape}}. Barbe : {{beard}}. Conserve strictement l'identité du visage, l'angle de prise de vue, la carnation, la direction de la lumière et l'arrière-plan d'origine. Rendu photographique naturel.$q$,
 '/demo/cut-contours-dessines.jpg', false, 200),

-- --------------------------- 8 colorations --------------------------------

('couleur-platine', 'Platine', 'color',
 array['tex:straight','tex:wavy','tex:curly','tex:coily','len:short','len:mid','len:long',
       'style:street','bold:high'],
 $q$Modifie uniquement la couleur des cheveux : blond platine très clair, presque blanc, appliqué uniformément avec des racines légèrement plus sombres. Ne change ni la coupe, ni la longueur, ni la texture ({{texture}}). Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/color-platine.jpg', false, 300),

('couleur-cendre', 'Gris cendré', 'color',
 array['tex:straight','tex:wavy','tex:curly','len:short','len:mid','len:long',
       'style:street','style:neat','bold:high'],
 $q$Modifie uniquement la couleur des cheveux : gris cendré froid, sans reflet jaune, appliqué uniformément. Ne change ni la coupe, ni la longueur, ni la texture ({{texture}}). Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/color-cendre.jpg', false, 310),

('couleur-caramel', 'Caramel', 'color',
 array['tex:straight','tex:wavy','tex:curly','tex:coily','len:short','len:mid','len:long',
       'style:classic','style:neat','bold:mid'],
 $q$Modifie uniquement la couleur des cheveux : châtain caramel chaud aux reflets dorés, appliqué uniformément. Ne change ni la coupe, ni la longueur, ni la texture ({{texture}}). Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/color-caramel.jpg', false, 320),

('couleur-meches', 'Mèches éclaircies', 'color',
 array['tex:straight','tex:wavy','tex:curly','len:mid','len:long','len:short',
       'style:street','bold:mid'],
 $q$Modifie uniquement la couleur des cheveux : mèches éclaircies irrégulières sur les pointes et le dessus, base restée naturelle. Ne change ni la coupe, ni la longueur, ni la texture ({{texture}}). Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/color-meches.jpg', false, 330),

('couleur-brun-froid', 'Brun froid', 'color',
 array['tex:straight','tex:wavy','tex:curly','tex:coily','len:short','len:mid','len:long',
       'style:classic','style:neat','bold:low'],
 $q$Modifie uniquement la couleur des cheveux : brun profond aux reflets froids, sans nuance rousse, appliqué uniformément. Ne change ni la coupe, ni la longueur, ni la texture ({{texture}}). Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/color-brun-froid.jpg', false, 340),

('couleur-blond-miel', 'Blond miel', 'color',
 array['tex:straight','tex:wavy','len:short','len:mid','len:long',
       'style:classic','style:street','bold:mid'],
 $q$Modifie uniquement la couleur des cheveux : blond miel doré, chaud et lumineux, appliqué uniformément. Ne change ni la coupe, ni la longueur, ni la texture ({{texture}}). Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/color-blond-miel.jpg', false, 350),

('couleur-reflets-cuivres', 'Reflets cuivrés', 'color',
 array['tex:straight','tex:wavy','tex:curly','len:short','len:mid','len:long',
       'style:street','bold:high'],
 $q$Modifie uniquement la couleur des cheveux : base foncée traversée de reflets cuivrés chauds visibles à la lumière. Ne change ni la coupe, ni la longueur, ni la texture ({{texture}}). Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/color-reflets-cuivres.jpg', true, 360),

('couleur-noir-intense', 'Noir intense', 'color',
 array['tex:straight','tex:wavy','tex:curly','tex:coily','len:shaved','len:short','len:mid','len:long',
       'style:classic','style:neat','style:sport','bold:low'],
 $q$Modifie uniquement la couleur des cheveux : noir profond et uniforme, légèrement brillant. Ne change ni la coupe, ni la longueur, ni la texture ({{texture}}). Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/color-noir-intense.jpg', false, 370),

-- --------------------------- 10 accessoires -------------------------------

('chaine-fine', 'Chaîne fine', 'accessory',
 array['acc:chains','style:neat','style:classic','bold:low'],
 $q$Ajoute un accessoire : une chaîne fine en métal argenté portée au ras du cou, sans pendentif. Ne modifie ni la coiffure, ni les vêtements, ni le visage. Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Reflets métalliques cohérents avec l'éclairage de la photo. Rendu photographique naturel.$q$,
 '/demo/acc-chaine-fine.jpg', false, 500),

('chaine-maille-large', 'Chaîne à maille large', 'accessory',
 array['acc:chains','style:street','bold:high'],
 $q$Ajoute un accessoire : une chaîne à grosse maille en métal doré portée sur le buste, maillons épais et visibles. Ne modifie ni la coiffure, ni le visage. Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Reflets métalliques cohérents avec l'éclairage de la photo. Rendu photographique naturel.$q$,
 '/demo/acc-chaine-maille-large.jpg', false, 510),

('chaine-double-rang', 'Chaîne double rang', 'accessory',
 array['acc:chains','style:street','bold:high'],
 $q$Ajoute un accessoire : deux chaînes métalliques superposées de longueurs différentes, l'une courte au ras du cou, l'autre plus longue sur le buste. Ne modifie ni la coiffure, ni le visage. Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/acc-chaine-double-rang.jpg', true, 520),

('pendentif-discret', 'Pendentif discret', 'accessory',
 array['acc:chains','style:classic','style:neat','bold:low'],
 $q$Ajoute un accessoire : une chaîne fine portant un petit pendentif géométrique sobre, posé au creux du buste. Ne modifie ni la coiffure, ni le visage. Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/acc-pendentif-discret.jpg', false, 530),

('puce-oreille', 'Puce d''oreille', 'accessory',
 array['acc:earrings','style:neat','style:classic','bold:low'],
 $q$Ajoute un accessoire : une petite puce d'oreille brillante au lobe visible. Ne modifie ni la coiffure, ni la forme de l'oreille, ni le visage. Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/acc-puce-oreille.jpg', false, 540),

('creole-fine', 'Créole fine', 'accessory',
 array['acc:earrings','style:street','bold:mid'],
 $q$Ajoute un accessoire : un anneau fin en métal argenté au lobe de l'oreille visible, diamètre modéré. Ne modifie ni la coiffure, ni la forme de l'oreille, ni le visage. Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/acc-creole-fine.jpg', false, 550),

('double-puce', 'Double puce', 'accessory',
 array['acc:earrings','style:street','style:neat','bold:mid'],
 $q$Ajoute un accessoire : deux petites puces brillantes alignées sur le lobe de l'oreille visible. Ne modifie ni la coiffure, ni la forme de l'oreille, ni le visage. Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/acc-double-puce.jpg', true, 560),

('grillz-une-dent', 'Grillz une dent', 'accessory',
 array['acc:grillz','style:street','bold:mid'],
 $q$Ajoute un accessoire : un cache-dent métallique amovible sur une seule dent de la rangée supérieure, visible uniquement si la bouche est ouverte ou souriante. Ne modifie ni la coiffure, ni la forme de la bouche, ni le visage. Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/acc-grillz-une-dent.jpg', false, 570),

('grillz-rangee-basse', 'Grillz rangée basse', 'accessory',
 array['acc:grillz','style:street','bold:high'],
 $q$Ajoute un accessoire : un cache-dents métallique amovible couvrant la rangée inférieure, visible uniquement si la bouche est ouverte ou souriante. Ne modifie ni la coiffure, ni la forme de la bouche, ni le visage. Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/acc-grillz-rangee-basse.jpg', true, 580),

('grillz-rangee-haute', 'Grillz rangée haute', 'accessory',
 array['acc:grillz','style:street','bold:high'],
 $q$Ajoute un accessoire : un cache-dents métallique amovible couvrant la rangée supérieure, visible uniquement si la bouche est ouverte ou souriante. Ne modifie ni la coiffure, ni la forme de la bouche, ni le visage. Conserve strictement l'identité du visage, la carnation, l'angle de prise de vue, la direction de la lumière et l'arrière-plan. Rendu photographique naturel.$q$,
 '/demo/acc-grillz-rangee-haute.jpg', true, 590)

on conflict (slug) do update
  set label           = excluded.label,
      category        = excluded.category,
      style_tags      = excluded.style_tags,
      prompt_template = excluded.prompt_template,
      preview_path    = excluded.preview_path,
      is_premium      = excluded.is_premium,
      sort_order      = excluded.sort_order;
