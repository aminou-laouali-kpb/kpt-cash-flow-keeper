

# Agrandir les signatures du Président et de la Trésorière (×2) dans le PDF

## Modification

Fichier : `src/lib/generatePaymentPDF.ts`

Changer la hauteur des cadres de signature de **25mm à 50mm** pour doubler la taille d'affichage des signatures dans le PDF généré.

```
// Avant
const sigBoxH = 25;

// Après
const sigBoxH = 50;
```

Cela double l'espace disponible pour les images de signature tout en conservant le ratio d'aspect original et le centrage automatique déjà en place.

