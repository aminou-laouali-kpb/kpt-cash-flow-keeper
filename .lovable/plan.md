
# Renommer "Mobile Money" en "MyNITA"

## Changements

Modifier le label affiche pour le mode de paiement `mobile_money` de "Mobile Money" a "MyNITA" dans les 5 fichiers suivants :

1. **`src/pages/PaiementForm.tsx`** (ligne 38) : label dans le formulaire de creation/edition
2. **`src/pages/PaiementDetail.tsx`** (ligne 25) : label dans la page de detail
3. **`src/pages/Comptabilite.tsx`** (ligne 23) : label dans la page comptabilite
4. **`src/lib/generatePaymentPDF.ts`** (ligne 15) : label dans le PDF genere
5. **`src/lib/exportUtils.ts`** (ligne 14) : label dans l'export CSV

La cle interne `mobile_money` reste inchangee dans la base de donnees — seul le texte affiche change.
