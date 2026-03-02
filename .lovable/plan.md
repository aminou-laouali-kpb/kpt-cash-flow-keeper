
# Uniformiser la taille des signatures dans le PDF

## Probleme

Les trois signatures utilisent le meme cadre et la meme logique de mise a l'echelle proportionnelle. Cependant, la signature du beneficiaire (capturee par le canvas avec `getTrimmedCanvas()`) est recadree sans marge autour des traits, ce qui fait que les traits remplissent tout le cadre disponible. Les signatures du president et de la tresoriere (images importees) contiennent naturellement de l'espace vide autour des traits, ce qui les fait paraitre plus petites.

## Solution

Appliquer un facteur de reduction uniforme (0.75) a toutes les signatures pour qu'elles ne remplissent pas entierement le cadre. Cela ajoute une marge interne supplementaire et donne un rendu plus naturel et professionnel, similaire a une signature au stylo sur papier.

### Fichier : `src/lib/generatePaymentPDF.ts`

Modifier le calcul de rendu des signatures (lignes 300-313) pour appliquer un facteur d'echelle apres le calcul proportionnel :

```text
Avant :
  maxW = sigWidth - 6
  maxH = sigBoxH - 6
  → Signature remplit tout l'espace disponible

Apres :
  maxW = (sigWidth - 6) * 0.75
  maxH = (sigBoxH - 6) * 0.75
  → Signature occupe 75% de l'espace, avec marge naturelle
  → Centrage horizontal et vertical dans le cadre complet
```

Le centrage sera recalcule sur la base de l'espace total (sigWidth - 6, sigBoxH - 6) pour que la signature reste centree dans le cadre.

## Fichier modifie

- `src/lib/generatePaymentPDF.ts` (lignes 300-313)
