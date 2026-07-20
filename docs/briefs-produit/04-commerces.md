# BRIEF AGENT — DépensePro

> **À coller tel quel dans un nouvel onglet Cursor pour générer l’app.**  
> Produit : suivi des dépenses et enveloppes pour commerces, boutiques, TPE/PME de services.

---

## 0. Mission de l’agent

Tu dois créer une application web complète nommée **DépensePro** (`depense-pro`).

Objectif produit : permettre à un commerce / une TPE de :
1. Structurer ses points de vente / départements (boutique, dépôt, admin)
2. Définir des enveloppes budgétaires mensuelles ou annuelles (loyer, stock, marketing…)
3. Enregistrer chaque dépense / achat fournisseur avec ticket ou facture
4. Imputer automatiquement ou manuellement sur la bonne enveloppe
5. Faire approuver les dépenses sensibles (gérant)
6. Suivre “budget vs réel” simplement
7. Exporter CSV / PDF pour l’expert-comptable

**Différence clé vs ONG/École/Univ :**  
- Moins de signatures solennelles (président/trésorier)
- Pas de logique bailleur / cost-share / convention recherche
- Focus **cash control** : achats fournisseurs, caisses, enveloppes mensuelles
- Validation gérant légère ; signature fournisseur optionnelle
- Vocabulaire commerce / PME

---

## 1. Référence technique

Réutiliser le repo KPT si fourni (React + Vite + TS + shadcn + Supabase + Edge Functions), puis **simplifier** :
- Retirer cost-share, import Excel bailleur ONG, hiérarchie programme/site ONG
- Adapter rôles, catégories, workflows

Langue UI : **français**.

---

## 2. Positionnement & personas

### Positionnement
« L’app simple pour savoir où part l’argent de la boutique — enveloppes, tickets, validation gérant. »

### Personas
| Persona | Rôle | Droits |
|---------|------|--------|
| Gérant / Propriétaire | `admin` | Tout, validation, paramètres |
| Comptable externe / assistant | `comptable` | Saisie, imputation, exports |
| Responsable de magasin | `manager` | Dépenses de son magasin, consultation enveloppes |
| Vendeur / employé | `employe` | Créer une dépense (petit cash), uploader ticket |
| Expert-comptable (lecture) | `lecture_seule` | Lecture + export |

---

## 3. Multi-tenant & settings

`organizations` = l’entreprise commerciale.

`settings_business` :
- nom commercial, logo, adresse, téléphone, email
- `gerant_nom`, `gerant_fonction` (défaut : Gérant)
- `devise_defaut` (XOF | EUR | MAD | autre)
- `prefixe_numerotation` (ex: `DP-ACH`)
- `periode_budget_defaut` : `mensuel` | `annuel` (défaut mensuel)
- `seuil_validation` numeric — dépenses ≥ seuil nécessitent approbation gérant (défaut 50000)
- `mention_legale`
- TVA : champ `tva_active boolean default false` + `tva_taux_defaut numeric` (si true, afficher HT/TVA/TTC sur dépenses)

v1 TVA : si `tva_active`, stocker `montant_ht`, `montant_tva`, `montant`(=TTC). Sinon `montant` seul.

---

## 4. Structure opérationnelle

Table `projects` → labels UI **« Magasins & services »**

| `type_projet` | Label | Exemple |
|---------------|-------|---------|
| `entreprise` | Entreprise | Ma Boutique SARL (racine) |
| `magasin` | Magasin / point de vente | Boutique Centre-Ville |
| `service` | Service | Marketing, Logistique, Admin |
| `caisse` | Caisse / fond de caisse | Caisse principale |

Hiérarchie :
```text
entreprise
  ├── magasin A
  │     └── caisse
  ├── magasin B
  └── service Marketing
```

Champs :
- `code`, `nom`, `adresse` (réutiliser description ou champ ville → renommer UI « Ville / quartier »)
- Pas de financeur / convention

Rattachement dépenses : magasin, service ou caisse.

---

## 5. Enveloppes budgétaires (simplifiées)

Renommer UX « Budgets » → **« Enveloppes »**.

`budgets` :
- `project_id` → souvent magasin ou entreprise racine
- `nom` (ex: « Mars 2026 — Boutique Centre »)
- `kind` : `mensuel` | `annuel` | `ponctuel`
- `periode_debut date`, `periode_fin date` (obligatoires si mensuel/annuel)
- **Pas de cost_share en UI** (colonne nullable OK)
- Devise = devise locale
- Status draft/active/archived

`budget_categories` / `budget_lines` : conserver (rubriques = familles d’enveloppes).

### Import enveloppes (CSV simple)
```csv
rubrique,ligne,montant_prevu,notes
Loyers & charges,Loyer boutique,450000,
Achats marchandises,Réassort textile,2000000,
Marketing,Publicité Facebook,150000,
Frais généraux,Électricité,80000,
```

Pas d’import Excel bailleur ONG.

---

## 6. Dépenses

### Statuts
```text
brouillon
en_attente_approbation   -- si montant >= seuil_validation
approuve
refuse
paye                     -- optionnel: marquer comme réglé fournisseur
```

Simplification signatures :
- **Pas de circuit président/trésorier obligatoire**
- Approbation gérant = changement de statut (bouton Approuver) + log audit
- Signature canvas **optionnelle** (bénéficiaire/fournisseur) via token — module présent mais non bloquant pour clôturer
- PDF : « Justificatif de dépense — [Nom commerce] »

### Types
```text
ticket_caisse      -- petit cash / ticket
facture_fournisseur
remboursement_employe
autre
```

### Modes paiement
```text
especes | virement | cheque | mobile_money | carte_bancaire | credit_fournisseur | autre
```

### Catégories commerce
```text
achats_marchandises
fournitures_consommables
loyer_charges
energie_utilities
transport_livraison
marketing_publicite
entretien_reparation
equipement
salaires_charges_sociales   -- saisie manuelle simple, pas de paie
frais_bancaires
assurances
impots_taxes
deplacements
reception_clients
autre
```

### Champs utiles
- `fournisseur_nom` (alias UI de beneficiaire_nom)
- `fournisseur_telephone`, `fournisseur_email`
- `numero_facture` text
- `date_facture` date
- `mode_paiement`
- Si TVA active : `montant_ht`, `montant_tva`, `montant`

Garder colonnes techniques compatibles (`beneficiaire_*`) si réutilisation code KPT, mais **labels UI = Fournisseur**.

---

## 7. Modules & écrans

| Route | Label UI | Contenu |
|-------|----------|---------|
| `/` | Tableau de bord | Dépenses du mois, enveloppes critiques (>80%), file d’approbation gérant, top catégories |
| `/projets` | **Magasins & services** | Arbre entreprise → magasins/services |
| `/budgets` | **Enveloppes** | Mensuelles/annuelles, jauges consommation |
| `/budgets/nouveau` | Nouvelle enveloppe | CSV ou saisie manuelle lignes |
| `/budgets/:id` | Détail enveloppe | Lignes + réel + IA conseils cash |
| `/paiements` | Dépenses | Filtres magasin / catégorie / statut |
| `/paiements/nouveau` | Nouvelle dépense | Ticket / facture + photo ticket |
| `/comptabilite` | Export compta | CSV pour expert-comptable (colonnes date, fournisseur, catégorie, HT, TVA, TTC, mode, magasin) |
| `/parametres` | Entreprise | Seuil validation, TVA, devise, membres, logo |

Publiques :
- `/signer/:token` — optionnel fournisseur
- `/public/budget/:token` — partage enveloppe au partenaire / associé (label « Lien associé »)

### Mobile-first partiel
La saisie dépense + upload photo ticket doit être **très confortable sur mobile** (employés en boutique).  
Liste + forms : gros boutons, capture `accept="image/*" capture="environment"` sur upload.

---

## 8. Workflows précis

### A. Petite dépense (< seuil)
1. Employé/manager crée ticket_caisse + photo
2. Statut `approuve` automatique (ou `brouillon` puis publish → `approuve`)
3. Imputation IA ou manuelle

### B. Dépense sensible (≥ seuil)
1. Création → `en_attente_approbation`
2. Gérant approuve → `approuve` ou refuse
3. Notification UI (badge sidebar) suffit en v1 (pas d’email obligatoire)

### C. Imputation
- Manuelle (comptable/admin/manager)
- IA `categorize-expense`
- Multi-lignes OK
- Récap X/Y

### D. Insights IA
Prompt :
> Tu es un conseiller de gestion pour commerces et TPE. Analyse les enveloppes : dépassements, postes où réduire, rappels de saisonnalité (ex: stock avant fêtes). Ton concret, chiffres, français.

Ne jamais parler d’ONG, bailleur, école, labo.

---

## 9. Design

- Direction : **commerce pragmatique**
- Couleurs : vert forêt profond + orange cuivré discret (pas purple, pas cream terracotta cliché)
- Typo : Sora (titres) + Figtree (corps)
- Login : nom commerce hero + logo
- Dashboard : jauges enveloppes très lisibles
- 2–3 micro-interactions : apparition KPI, progress enveloppe animée, toast approbation

---

## 10. Seed démo

Org `boutique-demo` — « Boutique Horizon »
- Magasins : Centre-Ville, Marché
- Service : Admin
- Enveloppe mensuelle « Juillet 2026 » avec 6 lignes
- 10 dépenses : tickets + 2 factures dont 1 en attente d’approbation
- Seuil validation = 50000
- TVA off
- Préfixe `DP-ACH`
- Devise XOF

---

## 11. Edge functions

| Function | Adaptation |
|----------|------------|
| `invite-user` | Rôles commerce |
| `import-budget` | CSV enveloppes commerce uniquement |
| `categorize-expense` | Prompt TPE/commerce + catégories boutique |
| `auto-categorize-batch` | Idem |
| `budget-insights` | Conseils cash commerce |
| `public-budget-view` | Lien associé |

Retirer toute logique “programme parent ONG” dans categorize : rattacher au budget actif du magasin / entreprise.

---

## 12. Ce qu’il faut RETIRER du code KPT (si fork)

- [ ] Cost-share UI et totaux cost-share
- [ ] Import Excel « Project Costs USD »
- [ ] Catégories sportives ONG
- [ ] Signataires Président / Trésorière obligatoires
- [ ] Statuts `en_attente_signature` / `signe` comme flux principal → remplacer par approbation gérant
- [ ] Mentions « association », « bailleur », « programme »
- [ ] Branding KPT

Conserver : pièces jointes, versions, audit, allocations, share links, PDF, RLS patterns.

---

## 13. Livrables

App buildable, migrations multi-tenant, edge functions, README, `.env.example`, seed, tests smoke, zéro secret.

---

## 14. Hors scope

- Logiciel de caisse enregistreuse (POS) temps réel
- Gestion de stock / inventaire avancé
- Facturation clients (ventes) — v1 = **dépenses only**
- Déclarations fiscales automatiques
- Synchronisation bancaire Open Banking
- Paie complète

---

## 15. Critères d’acceptation

- [ ] Vocabulaire 100% commerce (magasin, enveloppe, fournisseur, ticket)
- [ ] Seuil d’approbation gérant respecté
- [ ] Upload ticket mobile (capture caméra)
- [ ] Enveloppes mensuelles avec jauge % 
- [ ] Import CSV enveloppes
- [ ] Export compta CSV colonnes expert-comptable
- [ ] TVA optionnelle (HT/TVA/TTC) si activée
- [ ] IA prompts commerce
- [ ] Signatures fournisseur optionnelles (non bloquantes)
- [ ] Multi-tenant RLS
- [ ] Aucune occurrence KPT / ONG / bailleur / président-trésorier

---

## 16. Ordre d’implémentation

1. Auth + org + settings_business (seuil, TVA, période)
2. Magasins & services
3. Dépenses + upload ticket mobile + PDF
4. Approbation gérant (statuts)
5. Enveloppes + import CSV + jauges
6. Imputation + IA
7. Export compta + partage associé + seed

---

## 17. Note produit pour l’agent

DépensePro doit se sentir **plus simple et plus rapide** que BudgetTrace ONG / BudgetCampus.  
Si un choix UX se présente : préférer moins de champs, plus de defaults intelligents (catégorie suggérée, magasin du user, période mois courant).
