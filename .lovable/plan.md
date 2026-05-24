## Objectif

1. Permettre la sélection **manuelle** d'une rubrique budgétaire lors de l'imputation d'un paiement (l'IA seule n'est pas assez précise).
2. Rendre les fonctionnalités IA (suggestion d'imputation, conseils budget, partage…) accessibles à **tous les utilisateurs connectés**, et pas seulement aux rôles `admin` / `comptable`.

---

## 1. Sélection manuelle de la rubrique sur une dépense

Dans `PaiementDetail.tsx` → carte « Imputation budgétaire » :

- Ajouter un bouton **« Imputer manuellement »** à côté du bouton « Suggérer (IA) ».
- Ouvre un `Dialog` qui permet de :
  - Choisir le **budget actif** (Select, pré-sélectionne celui du programme parent du projet quand il existe).
  - Choisir la **rubrique parente** (catégorie) — Select alimenté depuis `budget_categories` du budget choisi.
  - Choisir la **ligne budgétaire** finale — Select filtré par la rubrique (et par ville du projet si renseignée, avec option « toutes villes »).
  - Saisir le **montant alloué** (pré-rempli avec le montant restant à imputer du paiement, conversion XOF↔USD automatique selon devise du budget).
  - Champ optionnel **commentaire** (stocké dans `reasoning`).
- À la validation : insertion dans `payment_budget_allocations` avec `source = "manual"`, `confidence = 1`, `validated_by`/`validated_at` remplis.
- Le bouton reste disponible même quand une imputation existe déjà (permet l'imputation **multi-lignes** d'un même paiement).
- Petit récap au-dessus de la liste : « X / Y imputé » (somme des allocations vs. montant du paiement) pour guider la répartition.

Nouveau hook `useBudgetLinesForPicker(budgetId)` (ou extension de `useBudgets`) pour charger budgets actifs + catégories + lignes en une seule requête, mis en cache via React Query.

Aucune modification du schéma DB nécessaire — la table `payment_budget_allocations` accepte déjà `source = "manual"`.

---

## 2. Ouvrir l'IA à tous les utilisateurs

Aujourd'hui les rôles `lecture_seule` ne peuvent ni déclencher la suggestion IA, ni voir les insights budget car les RLS / les edge functions limitent à `admin` + `comptable`.

### Edge functions
- `categorize-expense`, `budget-insights`, `auto-categorize-batch` : retirer toute vérification de rôle, garder uniquement la vérification **utilisateur connecté** (JWT valide). L'écriture en base reste faite côté serveur via service role, donc on contrôle ce qui est inséré.

### RLS
- `payment_budget_allocations` : ouvrir l'**INSERT** (allocations issues de l'IA) à tout utilisateur authentifié. L'UPDATE/DELETE manuels restent réservés à `admin` + `comptable` pour éviter qu'un lecteur supprime/modifie une imputation validée.
- `budget_insights` : ouvrir l'INSERT à tout utilisateur authentifié (la lecture l'est déjà). UPDATE/DELETE restent admin/comptable.
- `categorization_rules` : l'INSERT (apprentissage) passe à tout authentifié.
- `budget_share_links` : la **création** d'un lien de partage reste réservée à admin/comptable (action de gouvernance), mais la **lecture** est déjà ouverte — pas de changement.

### Frontend
- `PaiementDetail.tsx` / `BudgetDetail.tsx` : supprimer les conditions `isAdminOrComptable` qui masquent les boutons « Suggérer (IA) », « Analyser le budget », « Conseils IA ». Garder cette restriction uniquement sur les actions destructives (supprimer une imputation, modifier le budget, créer un lien de partage).
- La sélection manuelle décrite au §1 reste, elle, réservée à admin/comptable (action de saisie comptable).

---

## Détails techniques

```text
Fichiers modifiés :
  src/pages/PaiementDetail.tsx            — bouton + dialog manuel, suppression gating IA
  src/pages/BudgetDetail.tsx              — suppression gating IA sur insights
  src/hooks/useBudgetAllocations.ts       — pas de changement majeur (createAllocation existe déjà)
  src/hooks/useBudgets.ts (ou nouveau)    — loader rubriques + lignes pour le picker
  supabase/functions/categorize-expense/index.ts
  supabase/functions/budget-insights/index.ts
  supabase/functions/auto-categorize-batch/index.ts

Migration SQL :
  - DROP + recreate des policies INSERT sur :
      payment_budget_allocations, budget_insights, categorization_rules
    pour autoriser tout utilisateur authentifié.
  - Les policies ALL existantes sont remplacées par des policies séparées
    SELECT (déjà ouvert) / INSERT (tout auth) / UPDATE+DELETE (admin/comptable).
```

---

## Hors scope

- Pas de modification du schéma `budget_lines` / `budgets`.
- Pas de changement sur l'export PDF/Excel ni sur la vue publique partagée.
- Pas d'historisation supplémentaire des choix manuels (l'audit reste via `payment_versions` existant).
