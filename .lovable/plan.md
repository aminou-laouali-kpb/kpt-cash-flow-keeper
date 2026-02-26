

# Correction de la taille des signatures dans le PDF

## Probleme identifie

Les cadres de signature dans le PDF utilisent un ratio 1:1 (carre) avec `sigBoxH = sigWidth`, ce qui donne des cadres d'environ 57mm x 57mm. Les signatures a l'interieur font environ 49mm de haut, ce qui est beaucoup trop grand par rapport a une signature au stylo (environ 15-20mm de haut).

## Verification du partage de lien

Apres analyse complete :
- La route `/signer/:token` est correctement en acces public (pas de `ProtectedRoute`)
- Les politiques de securite permettent l'insertion de signatures par des utilisateurs anonymes via token
- La mise a jour du statut se fait via le trigger automatique (SECURITY DEFINER)
- Aucun blocage detecte sur le flux de signature a distance

## Correction prevue

### Fichier : `src/lib/generatePaymentPDF.ts`

Reduire la hauteur des cadres de signature pour obtenir une taille realiste :

- Changer `sigBoxH` de `sigWidth` (57mm) a environ `25` mm (hauteur du cadre)
- Ajuster le padding interne de l'image de signature en consequence (2-3mm de marge au lieu de 4mm)
- Cela donnera des signatures d'environ 20mm de haut dans le PDF, similaire a une signature au stylo

### Detail technique

Lignes concernees (252-286) :

```text
Avant :
  sigBoxH = sigWidth          → ~57mm (trop grand)
  image: sigWidth-8 x sigBoxH-8 → ~49x49mm

Apres :
  sigBoxH = 25                → 25mm (taille realiste)
  image: sigWidth-6 x sigBoxH-6 → ~51x19mm (proportions naturelles)
```

## Fichiers modifies

- `src/lib/generatePaymentPDF.ts` : reduction de la hauteur des cadres et images de signature
