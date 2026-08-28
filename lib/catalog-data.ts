/**
 * Source de vérité du catalogue (38 entrées, section 6).
 * Le seed SQL est régénéré depuis ce fichier : `node scripts/generate-seed.mjs`.
 * Sert aussi de repli quand Supabase n'est pas encore configuré.
 */
import type { CatalogItem } from '@/types/db';

export type CatalogSeed = Omit<CatalogItem, 'id'>;

export const CATALOG_SEED: readonly CatalogSeed[] = [
  {
    "slug": "cut-fade-bas",
    "label": "Dégradé bas",
    "category": "cut",
    "style_tags": [
      "court",
      "raides",
      "ondules",
      "boucles",
      "crepus",
      "ovale",
      "rond",
      "carre",
      "allonge",
      "classique",
      "soigne",
      "sportif",
      "discret",
      "modere"
    ],
    "prompt_template": "Coiffure : dégradé bas net, longueur conservée sur le dessus, transition progressive au-dessus des oreilles. Texture de cheveux {{texture}}, longueur de départ {{length}}, barbe {{beard}}. Conserve strictement le visage, l'angle de prise de vue et l'éclairage d'origine.",
    "preview_path": "/demo/catalog/cut-fade-bas.jpg",
    "is_premium": false,
    "sort_order": 10
  },
  {
    "slug": "cut-fade-haut",
    "label": "Dégradé haut",
    "category": "cut",
    "style_tags": [
      "court",
      "raides",
      "ondules",
      "boucles",
      "crepus",
      "ovale",
      "carre",
      "allonge",
      "streetwear",
      "sportif",
      "modere",
      "remarque"
    ],
    "prompt_template": "Coiffure : dégradé haut marqué, contraste net entre les côtés très courts et le dessus. Texture {{texture}}, longueur de départ {{length}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-fade-haut.jpg",
    "is_premium": false,
    "sort_order": 20
  },
  {
    "slug": "cut-fade-mid",
    "label": "Dégradé mi-hauteur",
    "category": "cut",
    "style_tags": [
      "court",
      "raides",
      "ondules",
      "boucles",
      "crepus",
      "ovale",
      "rond",
      "carre",
      "classique",
      "soigne",
      "modere"
    ],
    "prompt_template": "Coiffure : dégradé à mi-hauteur, équilibré, dessus travaillé vers l'avant. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-fade-mid.jpg",
    "is_premium": false,
    "sort_order": 30
  },
  {
    "slug": "cut-buzz",
    "label": "Coupe très courte à la tondeuse",
    "category": "cut",
    "style_tags": [
      "rase",
      "court",
      "raides",
      "ondules",
      "boucles",
      "crepus",
      "ovale",
      "carre",
      "sportif",
      "streetwear",
      "remarque"
    ],
    "prompt_template": "Coiffure : coupe uniforme très courte à la tondeuse, longueur régulière sur tout le crâne. Barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-buzz.jpg",
    "is_premium": false,
    "sort_order": 40
  },
  {
    "slug": "cut-crop-francais",
    "label": "Crop français",
    "category": "cut",
    "style_tags": [
      "court",
      "raides",
      "ondules",
      "ovale",
      "allonge",
      "carre",
      "streetwear",
      "soigne",
      "modere"
    ],
    "prompt_template": "Coiffure : frange courte droite texturée sur le front, côtés dégradés courts. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-crop-francais.jpg",
    "is_premium": false,
    "sort_order": 50
  },
  {
    "slug": "cut-mi-long-texture",
    "label": "Mi-long texturé",
    "category": "cut",
    "style_tags": [
      "mi-long",
      "long",
      "raides",
      "ondules",
      "boucles",
      "ovale",
      "carre",
      "allonge",
      "classique",
      "soigne",
      "modere"
    ],
    "prompt_template": "Coiffure : longueur mi-longue, mèches texturées à l'effilage, mouvement naturel vers l'arrière. Texture {{texture}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-mi-long-texture.jpg",
    "is_premium": false,
    "sort_order": 60
  },
  {
    "slug": "cut-boucle-degage",
    "label": "Coupe bouclée dégagée",
    "category": "cut",
    "style_tags": [
      "court",
      "mi-long",
      "boucles",
      "crepus",
      "ondules",
      "rond",
      "ovale",
      "carre",
      "streetwear",
      "soigne",
      "modere"
    ],
    "prompt_template": "Coiffure : boucles conservées et définies sur le dessus, côtés dégagés courts. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve la définition naturelle des boucles, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-boucle-degage.jpg",
    "is_premium": false,
    "sort_order": 70
  },
  {
    "slug": "cut-afro-court",
    "label": "Afro court net",
    "category": "cut",
    "style_tags": [
      "court",
      "crepus",
      "boucles",
      "rond",
      "carre",
      "ovale",
      "classique",
      "soigne",
      "discret",
      "modere"
    ],
    "prompt_template": "Coiffure : afro court de longueur régulière, contours nets au niveau du front et des tempes. Texture {{texture}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-afro-court.jpg",
    "is_premium": false,
    "sort_order": 80
  },
  {
    "slug": "cut-twists-courtes",
    "label": "Twists courtes",
    "category": "cut",
    "style_tags": [
      "court",
      "mi-long",
      "crepus",
      "boucles",
      "ovale",
      "rond",
      "allonge",
      "streetwear",
      "remarque"
    ],
    "prompt_template": "Coiffure : petites torsades régulières réparties sur l'ensemble du crâne. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-twists-courtes.jpg",
    "is_premium": false,
    "sort_order": 90
  },
  {
    "slug": "cut-undercut-raie",
    "label": "Undercut à raie marquée",
    "category": "cut",
    "style_tags": [
      "court",
      "mi-long",
      "raides",
      "ondules",
      "ovale",
      "allonge",
      "carre",
      "classique",
      "soigne",
      "modere"
    ],
    "prompt_template": "Coiffure : côtés rasés courts, dessus long peigné sur le côté avec une raie nette. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-undercut-raie.jpg",
    "is_premium": false,
    "sort_order": 100
  },
  {
    "slug": "cut-carre-effile",
    "label": "Carré effilé mi-long",
    "category": "cut",
    "style_tags": [
      "mi-long",
      "raides",
      "ondules",
      "ovale",
      "allonge",
      "soigne",
      "modere"
    ],
    "prompt_template": "Coiffure : longueur au niveau de la mâchoire, pointes effilées, volume maîtrisé. Texture {{texture}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-carre-effile.jpg",
    "is_premium": false,
    "sort_order": 110
  },
  {
    "slug": "cut-long-ondule",
    "label": "Long ondulé",
    "category": "cut",
    "style_tags": [
      "long",
      "mi-long",
      "ondules",
      "boucles",
      "raides",
      "ovale",
      "carre",
      "streetwear",
      "remarque"
    ],
    "prompt_template": "Coiffure : cheveux longs jusqu'aux épaules, ondulations naturelles, raie centrale souple. Texture {{texture}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-long-ondule.jpg",
    "is_premium": false,
    "sort_order": 120
  },
  {
    "slug": "cut-degrade-couches",
    "label": "Dégradé en couches",
    "category": "cut",
    "style_tags": [
      "mi-long",
      "long",
      "ondules",
      "raides",
      "boucles",
      "rond",
      "ovale",
      "streetwear",
      "remarque"
    ],
    "prompt_template": "Coiffure : couches superposées, volume marqué sur le dessus, longueurs plus légères en pointes. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-degrade-couches.jpg",
    "is_premium": true,
    "sort_order": 130
  },
  {
    "slug": "cut-blowout-texture",
    "label": "Blowout texturé",
    "category": "cut",
    "style_tags": [
      "court",
      "mi-long",
      "ondules",
      "boucles",
      "crepus",
      "ovale",
      "allonge",
      "streetwear",
      "sportif",
      "remarque"
    ],
    "prompt_template": "Coiffure : volume brossé vers le haut et l'arrière, côtés courts, pointes texturées. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-blowout-texture.jpg",
    "is_premium": true,
    "sort_order": 140
  },
  {
    "slug": "cut-brosse-courte",
    "label": "Brosse courte",
    "category": "cut",
    "style_tags": [
      "court",
      "rase",
      "raides",
      "ondules",
      "carre",
      "ovale",
      "sportif",
      "classique",
      "discret"
    ],
    "prompt_template": "Coiffure : dessus court coupé droit en brosse, côtés courts réguliers. Texture {{texture}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-brosse-courte.jpg",
    "is_premium": false,
    "sort_order": 150
  },
  {
    "slug": "cut-bol-moderne",
    "label": "Coupe au bol revisitée",
    "category": "cut",
    "style_tags": [
      "court",
      "mi-long",
      "raides",
      "ondules",
      "boucles",
      "ovale",
      "allonge",
      "streetwear",
      "remarque"
    ],
    "prompt_template": "Coiffure : ligne de coupe circulaire nette sur le dessus, nuque et tempes dégagées. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-bol-moderne.jpg",
    "is_premium": true,
    "sort_order": 160
  },
  {
    "slug": "cut-tresses-plaquees",
    "label": "Tresses plaquées",
    "category": "cut",
    "style_tags": [
      "court",
      "mi-long",
      "crepus",
      "boucles",
      "ovale",
      "rond",
      "allonge",
      "streetwear",
      "remarque"
    ],
    "prompt_template": "Coiffure : tresses plaquées parallèles suivant la forme du crâne, raies nettes. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-tresses-plaquees.jpg",
    "is_premium": true,
    "sort_order": 170
  },
  {
    "slug": "cut-locks-courtes",
    "label": "Locks courtes",
    "category": "cut",
    "style_tags": [
      "court",
      "mi-long",
      "crepus",
      "boucles",
      "ovale",
      "carre",
      "streetwear",
      "modere",
      "remarque"
    ],
    "prompt_template": "Coiffure : locks courtes régulières réparties sur le crâne, pointes nettes. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-locks-courtes.jpg",
    "is_premium": true,
    "sort_order": 180
  },
  {
    "slug": "cut-nuque-longue",
    "label": "Nuque longue, côtés courts",
    "category": "cut",
    "style_tags": [
      "mi-long",
      "court",
      "raides",
      "ondules",
      "boucles",
      "ovale",
      "carre",
      "streetwear",
      "remarque"
    ],
    "prompt_template": "Coiffure : côtés et dessus courts, longueur conservée uniquement sur la nuque. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-nuque-longue.jpg",
    "is_premium": false,
    "sort_order": 190
  },
  {
    "slug": "cut-frange-texturee",
    "label": "Frange texturée",
    "category": "cut",
    "style_tags": [
      "court",
      "mi-long",
      "raides",
      "ondules",
      "allonge",
      "ovale",
      "soigne",
      "streetwear",
      "modere"
    ],
    "prompt_template": "Coiffure : frange souple retombant sur le front, longueurs texturées sur les côtés. Texture {{texture}}, longueur {{length}}, barbe {{beard}}. Conserve le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/cut-frange-texturee.jpg",
    "is_premium": false,
    "sort_order": 200
  },
  {
    "slug": "color-platine",
    "label": "Platine",
    "category": "color",
    "style_tags": [
      "couleur",
      "raides",
      "ondules",
      "boucles",
      "crepus",
      "streetwear",
      "remarque"
    ],
    "prompt_template": "Coloration : blond platine froid uniforme sur l'ensemble de la chevelure, racines incluses. Conserve la coupe existante, la texture {{texture}}, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/color-platine.jpg",
    "is_premium": false,
    "sort_order": 210
  },
  {
    "slug": "color-cendre",
    "label": "Cendré",
    "category": "color",
    "style_tags": [
      "couleur",
      "raides",
      "ondules",
      "boucles",
      "soigne",
      "modere"
    ],
    "prompt_template": "Coloration : blond cendré froid sans reflet doré. Conserve la coupe, la texture {{texture}}, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/color-cendre.jpg",
    "is_premium": false,
    "sort_order": 220
  },
  {
    "slug": "color-caramel",
    "label": "Caramel",
    "category": "color",
    "style_tags": [
      "couleur",
      "raides",
      "ondules",
      "boucles",
      "crepus",
      "classique",
      "modere"
    ],
    "prompt_template": "Coloration : châtain caramel chaud, reflets dorés discrets. Conserve la coupe, la texture {{texture}}, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/color-caramel.jpg",
    "is_premium": false,
    "sort_order": 230
  },
  {
    "slug": "color-meches",
    "label": "Mèches éclaircies",
    "category": "color",
    "style_tags": [
      "couleur",
      "raides",
      "ondules",
      "boucles",
      "streetwear",
      "modere",
      "remarque"
    ],
    "prompt_template": "Coloration : mèches éclaircies fines réparties sur le dessus, base conservée plus foncée. Conserve la coupe, la texture {{texture}}, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/color-meches.jpg",
    "is_premium": false,
    "sort_order": 240
  },
  {
    "slug": "color-blond-miel",
    "label": "Blond miel",
    "category": "color",
    "style_tags": [
      "couleur",
      "raides",
      "ondules",
      "boucles",
      "classique",
      "soigne",
      "modere"
    ],
    "prompt_template": "Coloration : blond miel chaud uniforme. Conserve la coupe, la texture {{texture}}, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/color-blond-miel.jpg",
    "is_premium": false,
    "sort_order": 250
  },
  {
    "slug": "color-chatain-froid",
    "label": "Châtain froid",
    "category": "color",
    "style_tags": [
      "couleur",
      "raides",
      "ondules",
      "boucles",
      "crepus",
      "classique",
      "soigne",
      "discret"
    ],
    "prompt_template": "Coloration : châtain froid profond, sans reflet roux. Conserve la coupe, la texture {{texture}}, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/color-chatain-froid.jpg",
    "is_premium": false,
    "sort_order": 260
  },
  {
    "slug": "color-noir-intense",
    "label": "Noir intense",
    "category": "color",
    "style_tags": [
      "couleur",
      "raides",
      "ondules",
      "boucles",
      "crepus",
      "classique",
      "soigne",
      "discret"
    ],
    "prompt_template": "Coloration : noir profond uniforme, brillance naturelle. Conserve la coupe, la texture {{texture}}, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/color-noir-intense.jpg",
    "is_premium": false,
    "sort_order": 270
  },
  {
    "slug": "color-roux-cuivre",
    "label": "Roux cuivré",
    "category": "color",
    "style_tags": [
      "couleur",
      "raides",
      "ondules",
      "boucles",
      "streetwear",
      "remarque"
    ],
    "prompt_template": "Coloration : roux cuivré saturé sur l'ensemble de la chevelure. Conserve la coupe, la texture {{texture}}, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/color-roux-cuivre.jpg",
    "is_premium": true,
    "sort_order": 280
  },
  {
    "slug": "acc-chaine-fine",
    "label": "Chaîne fine",
    "category": "accessory",
    "style_tags": [
      "chaines",
      "discret",
      "modere",
      "soigne",
      "classique"
    ],
    "prompt_template": "Accessoire : chaîne fine en métal argenté portée au ras du cou, reflets discrets. Conserve la coiffure, le visage, l'angle, la tenue et l'éclairage.",
    "preview_path": "/demo/catalog/acc-chaine-fine.jpg",
    "is_premium": false,
    "sort_order": 290
  },
  {
    "slug": "acc-chaine-maille",
    "label": "Chaîne maille épaisse",
    "category": "accessory",
    "style_tags": [
      "chaines",
      "streetwear",
      "remarque",
      "modere"
    ],
    "prompt_template": "Accessoire : chaîne à maille épaisse en métal argenté portée sur le buste. Conserve la coiffure, le visage, l'angle, la tenue et l'éclairage.",
    "preview_path": "/demo/catalog/acc-chaine-maille.jpg",
    "is_premium": false,
    "sort_order": 300
  },
  {
    "slug": "acc-chaine-pendentif",
    "label": "Chaîne à pendentif",
    "category": "accessory",
    "style_tags": [
      "chaines",
      "streetwear",
      "modere",
      "remarque"
    ],
    "prompt_template": "Accessoire : chaîne moyenne avec un pendentif géométrique sobre. Conserve la coiffure, le visage, l'angle, la tenue et l'éclairage.",
    "preview_path": "/demo/catalog/acc-chaine-pendentif.jpg",
    "is_premium": false,
    "sort_order": 310
  },
  {
    "slug": "acc-double-chaine",
    "label": "Double chaîne",
    "category": "accessory",
    "style_tags": [
      "chaines",
      "streetwear",
      "remarque"
    ],
    "prompt_template": "Accessoire : deux chaînes superposées de longueurs différentes en métal argenté. Conserve la coiffure, le visage, l'angle, la tenue et l'éclairage.",
    "preview_path": "/demo/catalog/acc-double-chaine.jpg",
    "is_premium": true,
    "sort_order": 320
  },
  {
    "slug": "acc-creole-fine",
    "label": "Créole fine",
    "category": "accessory",
    "style_tags": [
      "boucles",
      "streetwear",
      "modere",
      "soigne"
    ],
    "prompt_template": "Accessoire : petite créole fine en métal argenté à l'oreille visible. Conserve la coiffure, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/acc-creole-fine.jpg",
    "is_premium": false,
    "sort_order": 330
  },
  {
    "slug": "acc-puce-discrete",
    "label": "Puce discrète",
    "category": "accessory",
    "style_tags": [
      "boucles",
      "discret",
      "soigne",
      "classique"
    ],
    "prompt_template": "Accessoire : puce d'oreille discrète à l'oreille visible. Conserve la coiffure, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/acc-puce-discrete.jpg",
    "is_premium": false,
    "sort_order": 340
  },
  {
    "slug": "acc-anneau-epais",
    "label": "Anneau épais",
    "category": "accessory",
    "style_tags": [
      "boucles",
      "streetwear",
      "remarque"
    ],
    "prompt_template": "Accessoire : anneau d'oreille épais en métal argenté à l'oreille visible. Conserve la coiffure, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/acc-anneau-epais.jpg",
    "is_premium": true,
    "sort_order": 350
  },
  {
    "slug": "acc-grillz-simple",
    "label": "Grillz une dent",
    "category": "accessory",
    "style_tags": [
      "grillz",
      "streetwear",
      "modere"
    ],
    "prompt_template": "Accessoire : habillage dentaire métallique sur une seule dent, visible uniquement si la bouche est ouverte ou souriante. Conserve la coiffure, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/acc-grillz-simple.jpg",
    "is_premium": false,
    "sort_order": 360
  },
  {
    "slug": "acc-grillz-bas",
    "label": "Grillz rangée basse",
    "category": "accessory",
    "style_tags": [
      "grillz",
      "streetwear",
      "remarque"
    ],
    "prompt_template": "Accessoire : habillage dentaire métallique sur la rangée inférieure. Conserve la coiffure, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/acc-grillz-bas.jpg",
    "is_premium": true,
    "sort_order": 370
  },
  {
    "slug": "acc-grillz-complet",
    "label": "Grillz complet",
    "category": "accessory",
    "style_tags": [
      "grillz",
      "streetwear",
      "remarque"
    ],
    "prompt_template": "Accessoire : habillage dentaire métallique sur les deux rangées. Conserve la coiffure, le visage, l'angle et l'éclairage.",
    "preview_path": "/demo/catalog/acc-grillz-complet.jpg",
    "is_premium": true,
    "sort_order": 380
  }
];

/** Identifiants stables hors Supabase : le slug fait office d'id. */
export const FALLBACK_CATALOG: readonly CatalogItem[] = CATALOG_SEED.map((item) => ({
  ...item,
  id: item.slug,
}));
