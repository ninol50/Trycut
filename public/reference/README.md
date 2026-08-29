# Photos de référence des styles

Une image par style, qui sert **deux fois** : elle s'affiche comme vignette
dans le catalogue, et elle est montrée au modèle en même temps que la photo de
la personne. Elle lui dit ce qu'est réellement la coupe, là où la description
écrite ne fait que l'approcher.

Une seule photo à déposer par style, donc.

## Nom du fichier

Le nom est le **slug** du style, en `.jpg` :

```
public/reference/cut-buzz.jpg
public/reference/cut-degrade-espagnol.jpg
public/reference/beard-bouc.jpg
```

La liste complète des slugs se régénère à tout moment :

```bash
node -e "console.log(require('./lib/catalog.json').map(i=>i.slug).join('\n'))"
```

## Ce que doit montrer l'image

- **La coupe, nettement**, de face ou de trois quarts, sur fond simple.
- Rien qui distraie : pas de texte, pas de filtre marqué, pas de collage.
- Format libre, 1024 px de côté suffisent. JPEG, moins de 500 Ko.

Le visage de la référence n'a aucune importance : la consigne interdit
explicitement de le copier. Seule la forme de la coupe compte.

## Absence

Un style sans référence continue de fonctionner : le rendu se fait à la
description seule. C'est simplement moins fidèle. Tu peux donc les ajouter une
par une, en commençant par les coupes les plus demandées.

## Droits

N'utilise que des images dont tu détiens les droits d'usage commercial. Une
photo prise sur un autre site ou sur un réseau social ne t'appartient pas, et
elle serait ici transmise à un prestataire pour produire un rendu vendu.
