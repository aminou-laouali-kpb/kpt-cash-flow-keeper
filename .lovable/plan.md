

# Signatures PDF proportionnelles

## Probleme

Les images de signature sont inserees avec des dimensions fixes (`sigWidth - 6` x `sigBoxH - 6`), ce qui etire les signatures 1:1 dans un cadre rectangulaire. Resultat : signatures deformees et non professionnelles.

## Solution

Calculer les dimensions reelles de chaque image de signature avant de l'inserer dans le PDF, puis ajuster la taille pour qu'elle s'inscrive proportionnellement dans le cadre (fit proportionnel avec conservation du ratio).

### Fichier : `src/lib/generatePaymentPDF.ts`

1. **Ajouter une fonction utilitaire** `getImageDimensions(base64: string): Promise<{width: number, height: number}>` qui charge l'image dans un element `Image` temporaire pour recuperer ses dimensions naturelles (naturalWidth / naturalHeight).

2. **Modifier le chargement des images** : au lieu de stocker uniquement le base64 des signatures, stocker aussi leurs dimensions reelles. Les appels `loadImageAsBase64` et `loadLocalImage` dans le `Promise.all` seront completes par un appel a `getImageDimensions` pour chaque image chargee.

3. **Modifier le rendu des signatures** (ligne 286) : au lieu de forcer `sigWidth - 6` x `sigBoxH - 6`, calculer un "fit" proportionnel :

```text
Espace disponible : maxW = sigWidth - 6, maxH = sigBoxH - 6
Ratio image : imgRatio = naturalWidth / naturalHeight
Ratio cadre : boxRatio = maxW / maxH

Si imgRatio > boxRatio :
  → Image plus large que haute : largeur = maxW, hauteur = maxW / imgRatio
Sinon :
  → Image plus haute que large : hauteur = maxH, largeur = maxH * imgRatio

Centrer horizontalement et verticalement dans le cadre.
```

Cela garantit que chaque signature garde ses proportions naturelles et soit centree dans son cadre, quelle que soit la forme de l'image source.

## Detail technique

La structure `sigLabels` sera enrichie pour inclure les dimensions :

```text
sigLabels = [
  { title, name, img: base64, imgW: number, imgH: number },
  ...
]
```

Le rendu utilisera ces dimensions pour calculer le fit proportionnel avant `addImage`.

## Fichier modifie

- `src/lib/generatePaymentPDF.ts`

