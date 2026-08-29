# Où déposer les photos

Aucune image n'est générée par le code. Tant qu'un fichier est absent, l'app affiche un
cadre violet aux **dimensions exactes** de l'image attendue : pas d'image cassée, pas de
décalage de mise en page. Dépose le fichier au bon nom, il apparaît au rechargement.

Toutes les images vont dans `public/demo/`.

---

## 1. Les paires avant / après — les plus visibles

Six fichiers, en **1080 × 1350** (format 4:5), JPEG qualité 82, moins de 400 Ko chacun.

| Avant | Après | Où ça s'affiche |
|---|---|---|
| `before-1.jpg` | `after-1.jpg` | `after-1.jpg` sert aussi de **photo du hero** (la grande carte à équerres). La paire alimente le comparateur qui glisse. |
| `before-2.jpg` | `after-2.jpg` | Deuxième exemple, côte à côte |
| `before-3.jpg` | `after-3.jpg` | Troisième exemple, côte à côte |

**Le cadrage doit être identique entre l'avant et l'après.** Le comparateur superpose les
deux images : le moindre décalage de tête se voit immédiatement. Même distance, même
angle, même lumière — seule la coupe change.

---

## 2. Les vignettes du catalogue

Un fichier par style, dans `public/demo/catalog/`, en **400 × 400**, JPEG qualité 80,
moins de 60 Ko. Le nom du fichier est le `slug` du style.

Elles s'affichent en fond des tuiles de l'écran d'import. Celles qui manquent laissent
simplement la tuile violette avec son libellé : tu peux les ajouter au fur et à mesure,
rien ne casse.

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
acc-anneau-epais.jpg      acc-grillz-simple.jpg     acc-grillz-bas.jpg
acc-grillz-complet.jpg
```

La liste exacte se régénère à tout moment :

```bash
node -e "console.log(require('./lib/catalog.json').map(i=>i.preview_path.split('/').pop()).join('\n'))"
```

---

## 3. Les témoignages — optionnel

La section des avis clients ne s'affiche **que** si `lib/testimonials.ts` contient des
entrées. Elle est vide volontairement : n'y mets que de vrais avis, de personnes réelles
ayant accepté d'être citées et d'afficher leur photo. Chaque entrée demande une paire
avant/après supplémentaire, aux mêmes dimensions que ci-dessus.

---

## Droits

N'utilise que des visuels dont tu détiens les droits, avec l'accord écrit des personnes
photographiées pour un usage commercial. Aucune image reprise d'un autre site.
