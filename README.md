# KPT Comptabilité

Outil de gestion financière de l'association **KPT** (Karatou Pour Tous) : projets, budgets, paiements, pièces justificatives et circuit de signature.

## Fonctionnalités

- **Projets et budgets** : création de projets, budgets par lignes et catégories, import de budgets depuis Excel.
- **Paiements** : saisie, pièces jointes, historique des versions et répartition d'un paiement sur plusieurs lignes budgétaires.
- **Signatures** : demandes de signature électronique et page de signature dédiée.
- **Comptabilité** : tableau de bord, graphiques et exports PDF, Word et Excel.
- **Catégorisation automatique** des dépenses et analyses budgétaires (fonctions Supabase).
- **Partage public** d'un budget en lecture seule par lien.
- **Rôles** : admin et comptable, invitations par e-mail, journal d'audit.

## Stack

- React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Supabase : PostgreSQL avec RLS, Auth, Storage, Edge Functions
- TanStack Query, React Hook Form, Zod, Recharts
- jsPDF, docx, xlsx pour les exports

## Structure

```
src/pages/            écrans (Projets, Budgets, Paiements, Comptabilité, Signature…)
src/components/       composants UI
supabase/migrations/  schéma de la base et règles RLS
supabase/functions/   auto-categorize-batch, budget-insights, categorize-expense,
                      import-budget, invite-user, public-budget-view
```

## Démarrer en local

```bash
npm install
npm run dev
```

Variables d'environnement (fichier `.env`) :

| Variable | Rôle |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clé publique (anon) Supabase |

Les fonctions Supabase utilisent en plus `SUPABASE_SERVICE_ROLE_KEY` et `LOVABLE_API_KEY`, à définir dans les secrets Supabase, jamais dans le code.

## Origine

Projet créé avec [Lovable](https://lovable.dev) et maintenu par Karatou Pour Tous.
