# Briefs produit — verticales commercialisables

Ces fichiers sont des **cahiers des charges agents**.  
Chacun est autonome : tu peux le coller tel quel dans un nouvel onglet Cursor pour générer une app complète.

## Origine

Base technique analysée : app **KPT (Karatou Pour Tous)** — gestion des dépenses, budgets, justificatifs signés, imputation IA.

Stack de référence à réutiliser :
- React 18 + Vite + TypeScript
- shadcn/ui + Tailwind CSS
- Supabase (Auth, Postgres, RLS, Storage, Edge Functions)
- React Query
- Exports PDF / CSV / Excel
- IA (imputation + insights budget)

## Fichiers

| Fichier | Produit | Public cible |
|---------|---------|--------------|
| [`01-ong-associations.md`](./01-ong-associations.md) | **BudgetTrace ONG** | ONG, associations, fondations |
| [`02-ecoles.md`](./02-ecoles.md) | **BudgetÉcole** | Écoles primaires / collèges / lycées |
| [`03-universites.md`](./03-universites.md) | **BudgetCampus** | Universités, facultés, labos |
| [`04-commerces.md`](./04-commerces.md) | **DépensePro** | Commerces, TPE/PME, boutiques |

## Comment utiliser

1. Ouvre un nouvel onglet agent Cursor (ou un nouveau dépôt).
2. Colle **intégralement** le contenu du brief choisi.
3. Ajoute en tête si besoin : le lien vers le repo KPT source, ou un zip/clone de référence.
4. Demande : *« Implémente ce brief en partant du repo KPT fourni / de zéro selon les instructions. »*

## Règle commune à tous les briefs

Chaque produit conserve le **même schéma métier générique** :

```text
Organisation → Structure opérationnelle → Budget (rubriques/lignes)
            → Dépenses/Paiements → Imputation → Preuves (pièces + signatures)
            → Reporting / partage
```

Seuls changent : vocabulaire, rôles, catégories, branding, modules optionnels, contraintes réglementaires légères.
