# Visuels de démonstration

Aucun de ces fichiers n'est généré par le code. Tant qu'ils sont absents, l'application
rend un placeholder violet **aux dimensions explicites** : pas de layout shift, jamais de
`<video>` cassé ni d'image manquante.

Dépose simplement les fichiers ici, aux noms exacts ci-dessous, et ils apparaissent.

## Vidéo de démonstration (bloc signature de la landing)

| Fichier | Format | Dimensions | Poids max |
|---|---|---|---|
| `demo-loop.mp4` | H.264, sans piste audio | 720 × 1280 | < 2 Mo |
| `demo-loop.webm` | VP9, sans piste audio | 720 × 1280 | < 2 Mo |
| `demo-poster.jpg` | JPEG qualité 80 | 720 × 1280 | < 200 Ko |

Contenu attendu : un visage réel de face, la coupe qui se transforme, **en boucle de 4 à
6 secondes**. La vidéo est décorative (`aria-hidden`), muette, sans contrôles. Avec
`prefers-reduced-motion`, seul le poster est affiché — il doit donc se suffire à lui-même.

Les deux formats sont nécessaires : le `.webm` sert Chrome et Firefox, le `.mp4` sert
Safari et iOS.

## Paires avant / après

Trois paires, en 1080 × 1350 (ratio 4:5), JPEG qualité 82, < 400 Ko chacune :

| Avant | Après | Label affiché |
|---|---|---|
| `before-1.jpg` | `after-1.jpg` | dégradé bas |
| `before-2.jpg` | `after-2.jpg` | platine |
| `before-3.jpg` | `after-3.jpg` | chaîne fine |

Le cadrage doit être **strictement identique** entre le avant et le après : le comparateur
superpose les deux images, tout décalage se voit immédiatement.

## Vignettes du catalogue

Un fichier par entrée, dans `public/demo/catalog/`, en **400 × 400**, JPEG qualité 80,
< 60 Ko. Le nom du fichier correspond au `slug` de l'entrée :

```
cut-fade-bas.jpg          cut-fade-haut.jpg         cut-fade-mid.jpg
cut-buzz.jpg              cut-crop-francais.jpg     cut-mi-long-texture.jpg
cut-boucle-degage.jpg     cut-afro-court.jpg        cut-twists-courtes.jpg
cut-undercut-raie.jpg     cut-carre-effile.jpg      cut-long-ondule.jpg
cut-degrade-couches.jpg   cut-blowout-texture.jpg   cut-brosse-courte.jpg
cut-bol-moderne.jpg       cut-tresses-plaquees.jpg  cut-locks-courtes.jpg
cut-nuque-longue.jpg      cut-frange-texturee.jpg

color-platine.jpg         color-cendre.jpg          color-caramel.jpg
color-meches.jpg          color-blond-miel.jpg      color-chatain-froid.jpg
color-noir-intense.jpg    color-roux-cuivre.jpg

acc-chaine-fine.jpg       acc-chaine-maille.jpg     acc-chaine-pendentif.jpg
acc-double-chaine.jpg     acc-creole-fine.jpg       acc-puce-discrete.jpg
acc-anneau-epais.jpg      acc-grillz-simple.jpg     acc-grillz-complet.jpg
acc-grillz-bas.jpg
```

La liste exacte est dérivable à tout moment :

```bash
node -e "const{CATALOG_SEED}=require('fs').readFileSync('lib/catalog-data.ts','utf8');" \
  || grep -o '\"preview_path\": \"[^\"]*\"' lib/catalog-data.ts
```

## Droits

N'utilise que des visuels dont tu détiens les droits, avec l'accord écrit des personnes
photographiées pour un usage commercial. Aucune image de tiers, aucun visuel repris d'un
site existant.
