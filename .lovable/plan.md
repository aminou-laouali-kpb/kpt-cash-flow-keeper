## Objectif

Imputer automatiquement **chaque dépense existante et future** à une ligne du budget actif, sans clic manuel, avec un score de confiance et la possibilité pour le comptable de corriger.

## Contexte

- 1 budget actif, 13 lignes budgétaires, 44 paiements, 0 imputation à ce jour.
- La fonction `categorize-expense` existe déjà et sait choisir 1 ligne pour 1 paiement (règles apprises + IA Gemini fallback).
- Aujourd'hui elle ne tourne que si on clique "Suggérer" dans la fiche paiement → rien ne se passe en lot.

## Plan

### 1. Auto-imputation à la création / modification d'un paiement

- Dans `usePayments.createPayment` et `updatePayment` (champs motif/montant/bénéficiaire/projet) : appeler `categorize-expense` en arrière-plan après succès.
- Si `confidence >= 0.75` → créer directement l'allocation (`source: "ia_auto"`, non validée).
- Si `confidence < 0.75` → créer quand même l'allocation mais la marquer "à valider" (badge orange dans la fiche).
- Si aucune ligne trouvée → aucune allocation, badge "Non imputé" dans la liste paiements.

### 2. Nouvelle edge function `auto-categorize-batch`

Pour traiter les 44 paiements existants en une passe (et permettre une re-catégorisation globale plus tard).

- Input : `{ budget_id, only_unallocated?: boolean, project_id?: uuid }`
- Charge tous les paiements concernés (par défaut : ceux du programme du budget, sans allocation).
- Pour chaque paiement, exécute la même logique que `categorize-expense` (réutiliser une fonction helper partagée, ou appeler la fonction en interne via `sb.functions.invoke`).
- Respecte un délai entre appels IA (300 ms) pour éviter le 429.
- Renvoie un récap : `{ traités, imputés_auto, à_valider, non_imputés, erreurs }`.
- Logs `console.log` détaillés par paiement pour debug.

### 3. UI : bouton "Imputer toutes les dépenses" sur la page Budget

- Dans `BudgetDetail.tsx` (budget actif uniquement) : bouton `Sparkles` "Imputer automatiquement les dépenses".
- Dialogue de confirmation expliquant : "L'IA va analyser toutes les dépenses du programme et proposer une ligne budgétaire pour chacune. Vous pourrez ensuite valider ou corriger."
- Pendant traitement : barre de progression (polling toutes les 2s sur le compteur d'allocations), désactivation du bouton.
- À la fin : toast récap + redirection vers `/paiements?filtre=à_valider`.

### 4. Filtre "À valider" sur la liste Paiements

- Ajouter un onglet/filter : `Tous | Imputés auto | À valider | Non imputés | Validés`.
- Colonne "Imputation" affichant la ligne budgétaire + badge de source (`IA`, `Règle`, `Validé`).
- Click sur une ligne "à valider" → ouvre la fiche paiement avec section imputation pré-développée.

### 5. UX dans la fiche paiement

- Section "Imputation budgétaire" déjà existante : ajouter
  - Affichage du raisonnement IA (1 ligne courte).
  - Boutons `Valider` (✓) et `Corriger` (ouvre un combobox des lignes).
  - Sur correction manuelle → crée une `categorization_rule` (pattern = 2-3 mots clés du motif) pour apprendre.

### 6. Réapprentissage automatique

- Chaque fois qu'un comptable corrige une suggestion IA :
  - Extraire 2-3 mots significatifs du motif (déjà partiellement en place).
  - Insérer/incrémenter `categorization_rules` (pattern, budget_line_id, match_count++).
- Pas de migration nécessaire (table existe).

## Détails techniques

- Aucune nouvelle table ni migration.
- Nouvelle edge function : `supabase/functions/auto-categorize-batch/index.ts`.
- Modifications front : `useBudgetAllocations.ts` (mutation `batchCategorize`), `BudgetDetail.tsx`, `Paiements.tsx`, `PaiementDetail.tsx`, `usePayments.ts` (hook post-create/update).
- Modèle IA : `google/gemini-3-flash-preview` (déjà utilisé, économique et rapide).
- Coût : ~44 appels IA pour la première passe, puis 1 appel par nouveau paiement.

## Limites & garde-fous

- Si pas de budget actif sur le programme → bouton désactivé avec tooltip explicatif.
- Si paiement non lié à un projet → ignoré, listé dans "non imputés".
- Confidence threshold (0.75) configurable dans `settings_association` plus tard si besoin.

---

Passe en mode build pour que j'implémente.