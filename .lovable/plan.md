

# Corrections: statut apres signature, format montant, cadres signature carres

## 3 modifications a effectuer

### 1. Mise a jour du statut du paiement apres signature via lien

**Fichier** : `src/hooks/useSignatures.ts`

Dans la fonction `signViaToken` (ligne 144-175), ajouter apres la mise a jour de la `signature_request` :

```typescript
await supabase.from("payments").update({ statut: "signe" }).eq("id", input.payment_id);
```

### 2. Format du montant : points comme separateur de milliers

**Fichier** : `src/lib/generatePaymentPDF.ts`

La fonction `formatMontant` (ligne 26-29) utilise `toLocaleString("fr-FR")` qui produit des espaces insecables. jsPDF les affiche mal (comme "/"). Correction :

```typescript
function formatMontant(montant: number, devise: string): string {
  const formatted = Number(montant).toLocaleString("fr-FR").replace(/\s/g, ".");
  return `${formatted} ${deviseLabels[devise] || devise}`;
}
```

### 3. Cadres de signature en ratio 1:1 (carre)

**Fichier** : `src/lib/generatePaymentPDF.ts`

Actuellement les cadres font `sigWidth x 35mm` (rectangle). Pour un ratio 1:1, le cote du carre sera egal a `sigWidth` (environ 55mm). Modifications aux lignes 255-298 :

- Changer `sigBoxH = 35` en `sigBoxH = sigWidth` pour obtenir un carre
- Ajuster le placement de l'image de signature pour remplir le carre tout en gardant un padding
- L'image sera placee centree dans le carre avec un padding de 4mm de chaque cote
- Remonter le `sigStartY` si necessaire pour que les cadres tiennent sur la page (ajuster a `Math.max(y + 4, 180)` au lieu de 200)

## Fichiers modifies

- `src/hooks/useSignatures.ts` : ajout mise a jour statut paiement dans `signViaToken`
- `src/lib/generatePaymentPDF.ts` : correction format montant + cadres carres 1:1

