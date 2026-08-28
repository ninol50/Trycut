# Visuels de démonstration

Ce dossier ne contient **aucune image versionnée** : les visuels de
démonstration sont des photos de personnes réelles, ils sont donc fournis
séparément. Tant qu'un fichier est absent, l'application affiche un
placeholder violet (`bg-violet-50`, liseré `border-violet-200`, pictogramme
centré) aux dimensions exactes de l'image attendue.

Conséquence : **aucun `<img>` cassé et aucun décalage de mise en page**, que
les fichiers soient présents ou non. Voir `src/components/ui/DemoImage.tsx`.

## Paires avant / après — 1080 × 1350 (4:5)

Utilisées par le slider signature de la landing et les trois exemples de
transformation.

| Fichier | Contenu attendu |
|---|---|
| `before-1.jpg` | Homme de face, cheveux mi-longs, lumière neutre |
| `after-1.jpg`  | Même photo, dégradé bas appliqué |
| `before-2.jpg` | Homme de face, cheveux bouclés |
| `after-2.jpg`  | Même photo, boucles dégagées sur les côtés |
| `before-3.jpg` | Homme de face, cheveux châtains courts |
| `after-3.jpg`  | Même photo, coloration gris cendré |

`after-1.jpg` a un second rôle : le `MockProvider` le sert comme résultat de
génération quand il est présent. À défaut, le mock renvoie la photo source,
ce qui exerce quand même tout le pipeline (téléchargement → stockage privé →
URL signée).

## Vignettes de catalogue — 400 × 400 (1:1)

Une par entrée de `catalog_items`, nommée d'après `preview_path`. Cadrage
serré sur la tête, fond uni clair, même lumière d'une vignette à l'autre :
c'est la seule grille dense de l'app, l'hétérogénéité s'y voit immédiatement.

### Coupes (20)

```
cut-degrade-bas.jpg          cut-degrade-haut.jpg         cut-degrade-mi-hauteur.jpg
cut-degrade-a-blanc.jpg      cut-buzz-cut.jpg             cut-crop-francais.jpg
cut-mi-long-texture.jpg      cut-coupe-brosse.jpg         cut-boucles-degagees.jpg
cut-boucles-longues.jpg      cut-afro-court.jpg           cut-twists-courtes.jpg
cut-ondule-mi-long.jpg       cut-raie-sur-le-cote.jpg     cut-coiffe-en-arriere.jpg
cut-frange-texturee.jpg      cut-undercut-deconnecte.jpg  cut-long-uniforme.jpg
cut-nuque-longue-moderne.jpg cut-contours-dessines.jpg
```

### Colorations (8)

```
color-platine.jpg      color-cendre.jpg          color-caramel.jpg
color-meches.jpg       color-brun-froid.jpg      color-blond-miel.jpg
color-reflets-cuivres.jpg                        color-noir-intense.jpg
```

### Accessoires (10)

```
acc-chaine-fine.jpg          acc-chaine-maille-large.jpg  acc-chaine-double-rang.jpg
acc-pendentif-discret.jpg    acc-puce-oreille.jpg         acc-creole-fine.jpg
acc-double-puce.jpg          acc-grillz-une-dent.jpg      acc-grillz-rangee-basse.jpg
acc-grillz-rangee-haute.jpg
```

## Deux règles de contenu

1. **Droit à l'image.** Ces visuels montrent des visages. Il faut une
   autorisation écrite de chaque personne photographiée avant toute mise en
   ligne, y compris pour une simple démo.
2. **Aucune marque déposée** visible : pas de logo sur un vêtement, pas de
   nom de marque sur un accessoire. La contrainte vaut pour les images comme
   pour les libellés du catalogue.
