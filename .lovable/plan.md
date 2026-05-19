## Problème identifié

L'import "passe" sans erreur mais ne crée aucune ligne, car le parser de `supabase/functions/import-budget/index.ts` ne correspond pas au vrai format du fichier `AEIF_2025_Budget_Form.xlsx`.

### Format réel du fichier (8 colonnes)

```
A          B                        C       D       E         F         G       H
[num]      Rubrique (Contractual)   —       —       —         —         —       —
""         Description ligne        Cost$   Qty     Total$    CSCost$   CSQty   CSTotal$
""         "Subtotal"               —       —       Total     —         —       CSTotal
"Budget Justification (...)"        —       —       —         —         —       —
"1. Texte de justification..."      —       —       —         —         —       —
```

### Bugs du parser actuel

1. Lignes budgétaires : le code teste `c0 = string description` + `c1 = number`. En réalité `c0` est vide et la description est en `c1`, le cost en `c2`, la quantité en `c3`, le total en `c4`, le cost share en `c5/c6/c7`.
2. Subtotal : lit `c1` au lieu de `c4` pour le montant, et `row[2]` au lieu de `row[7]` pour cost share.
3. Total projet : ligne 5 = `"Total Funds Requested:"` est en `c2` (pas `c0`), montant en `c4` (pas `c1`), cost share en `c7`.
4. Titre projet : `c2 = "Project title:"` et titre en `c2` de la ligne suivante (pas `c1`).
5. Justification : le texte d'après peut être en `c0` ou se prolonger sur plusieurs lignes — on ne prend que la première.

Résultat : 0 rubrique passe la validation `c1 > 0` → import "réussi" mais vide → page budget vide.

## Plan de correction

### 1. Réécrire `parseExcelToStructure` dans `supabase/functions/import-budget/index.ts`

- Détecter le titre projet : ligne où `c2` contient "Project title" → titre = `c2` de la ligne suivante.
- Détecter total : ligne où `c2` contient "Total Funds Requested" → `total = c4`, `cost_share = c7`.
- Rubrique : `c0` est un entier 1..10 ET `c1` est une string non vide → nouvelle rubrique.
- Ligne budgétaire : `c0` vide ET `c1` string non vide ET `c1 !== "Subtotal"` ET `c4` (total) > 0 :
  - `libelle = c1`, `cost_unitaire = c2`, `quantite = c3`, `montant_prevu = c4`
  - `cost_share = c7 || 0`
- Subtotal : `c1 === "Subtotal"` → `subtotal = c4`, `subtotal_cost_share = c7`.
- Justification : ligne `c0` commence par "Budget Justification" → concaténer toutes les lignes suivantes non vides (en `c0`) jusqu'à la prochaine rubrique ou subtotal.
- Ignorer la ligne `"Overall Total Project Costs"` et `" Project Costs ($USD)"` (totaux finaux).

### 2. Améliorations robustesse

- Logger `console.log` du nombre de rubriques / lignes parsées avant insertion (pour debug futur via edge function logs).
- Retourner une erreur 400 explicite si 0 rubrique détectée (`"Format de fichier non reconnu — vérifiez qu'il s'agit du modèle AEIF Budget Form"`).
- Garder la 2e feuille `"Important Budget Guidance"` ignorée (déjà le cas, on lit seulement `SheetNames[0]`).

### 3. Re-tester

Tu pourras réimporter le même fichier `AEIF_2025_Budget_Form-2.xlsx`. Résultat attendu :
- 5 rubriques (Contractual, Supplies, Travel/Lodging/Per Diem, Equipment, Other Direct Costs)
- 13 lignes budgétaires
- Total 23 250 USD, cost share 3 300 USD
- Titre budget : "Niger FutureSkills Initiative: Empowering youth and women"

Pas de changement de schéma ni de migration DB.

---

Bascule en mode build pour que j'applique le correctif.