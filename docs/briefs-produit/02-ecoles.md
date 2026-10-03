# BRIEF AGENT — BudgetÉcole

> **À coller tel quel dans un nouvel onglet Cursor pour générer l’app.**  
> Produit : gestion des dépenses et budgets pour écoles (primaire, collège, lycée, groupes scolaires).

---

## 0. Mission de l’agent

Tu dois créer une application web complète nommée **BudgetÉcole** (`budget-ecole`).

Objectif produit : permettre à une école (ou un groupe scolaire) de :
1. Structurer son établissement (années scolaires, pôles, classes / services)
2. Gérer un budget annuel (fonctionnement, cantine, projets pédagogiques, dons)
3. Enregistrer chaque dépense avec justificatif
4. Faire valider / signer par direction + intendant (et éventuellement fournisseur)
5. Imputer sur les bonnes lignes budgétaires (manuel + IA)
6. Produire des états pour le conseil d’établissement / association de parents
7. Exporter PDF / CSV

**Différence clé vs ONG :** vocabulaire scolaire, année scolaire obligatoire, rôles direction/intendant, moins de logique “bailleur international USD”, plus de logique “budget annuel établissement”.

---

## 1. Référence technique

Si un repo source KPT est fourni :
- Réutilise React + Vite + TS + shadcn + Supabase + Edge Functions
- Remplace entièrement le domaine ONG (programmes bailleurs, cost-share USD, président/trésorier) par le domaine scolaire ci-dessous

Stack imposée : identique au brief ONG (React 18, Vite, TS, Tailwind, shadcn, React Query, Supabase, jsPDF, xlsx, signature canvas, edge AI).

Langue UI : **français**.

---

## 2. Positionnement & personas

### Positionnement
« Le carnet de bord financier de l’école : chaque dépense reliée au budget de l’année, avec validation direction. »

### Personas
| Persona | Rôle technique | Droits |
|---------|----------------|--------|
| Directeur / Directrice | `admin` | Tout + paramétrage + invitations |
| Intendant / Gestionnaire | `comptable` | Budgets, dépenses, imputation, exports |
| Enseignant responsable de projet | `enseignant` | Créer demandes de dépense sur ses projets, joindre reçus, lecture budget projet |
| Secrétariat | `secretariat` | Saisie dépenses simples, upload pièces, pas de suppression |
| Conseil / APE (lecture) | `lecture_seule` | Consultation dashboards & budgets |
| Fournisseur / parent remboursé | anon token | Signer accusé de paiement |

---

## 3. Multi-tenant

Obligatoire.

```text
organizations          → l’école ou le groupe scolaire
organization_members   → user_id, role
campuses (optionnel v1.1) → si groupe scolaire multi-sites
```

Pour la v1 : **1 organization = 1 établissement**.  
Prévoir `organization_id` partout pour fusion future multi-écoles.

Settings (`settings_school`) :
- nom établissement, logo, adresse, téléphone, email, académie/ville
- `directeur_nom`, `directeur_fonction` (défaut : Directeur)
- `intendant_nom`, `intendant_fonction` (défaut : Intendant)
- `devise_defaut` (XOF | EUR | MAD | autre)
- `prefixe_numerotation` (ex: `ECO-DEP`)
- `annee_scolaire_courante` (ex: `2025-2026`) — **champ critique**
- `mention_legale`

---

## 4. Structure opérationnelle (remplace “projets ONG”)

### Entité `projects` renommée UX en **« Pôles / Projets »**
Garder la table `projects` techniquement, mais UI :
- `type_projet` :
  - `annee` → conteneur année scolaire (ex: « AS 2025-2026 ») — équivalent programme
  - `pole` → Cantine, Pédagogie, Sport, Administration, Maintenance, Clubs
  - `projet` → projet ponctuel (sortie scolaire, kermesse, labo sciences…)
- `parent_id` : projet → pôle → année
- `ville` devient optionnel ; préférer `niveau` (primaire/collège/lycée) en champ texte libre v1

### Règle budgétaire
- Le budget actif est rattaché à l’entité `annee` (type_projet = annee)
- Les dépenses sont rattachées à un `pole` ou `projet`

---

## 5. Modèle de données

### Enums
```text
app_role: admin | comptable | enseignant | secretariat | lecture_seule
project_type: annee | pole | projet
project_status: actif | cloture
payment_status: brouillon | en_attente_validation | valide | a_re_signer
payment_type: recu_importe | fiche_manuelle | demande_achat
payment_mode: especes | virement | cheque | mobile_money | carte_bancaire | autre
signer_type: directeur | intendant | beneficiaire
expense_category: (voir liste)
budget_status: draft | active | archived
allocation_source: ia_auto | manual | rule
```

### Catégories de dépense (école)
```text
fournitures_scolaires
manuels_pedagogiques
cantine_alimentation
entretien_locaux
energie_eau
transport_scolaire
sorties_pedagogiques
equipement_informatique
equipement_sport
formation_personnel
communication
honoraires_intervenants
frais_administratifs
evenement_vie_scolaire
autre
```

### Tables
Même squelette que BudgetTrace ONG, avec adaptations :
- `payments.statut` utilise le cycle scolaire ci-dessus
- `payments.type` inclut `demande_achat`
- Ajouter `payments.annee_scolaire text` (copié depuis settings à la création)
- `budgets` : devise souvent = devise locale ; `montant_cost_share` **optionnel / masqué** (peu pertinent école) — garder colonne nullable pour compatibilité code, cacher en UI
- Import budget : **CSV/Excel simple scolaire** (pas le format bailleur USD ONG)

### Format import budget école (obligatoire)
Colonnes :
```csv
code_rubrique,rubrique,libelle_ligne,montant_prevu,notes
```
Exemple :
```csv
01,Fonctionnement,Fournitures bureau,500000,
01,Fonctionnement,Électricité,1200000,
02,Cantine,Denrées alimentaires,3500000,
03,Pédagogie,Sortie musée CM2,250000,Classe CM2
```

---

## 6. Modules & écrans

| Route | Label UI | Spécificité école |
|-------|----------|-------------------|
| `/` | Tableau de bord | Totaux année scolaire courante ; alertes budget pôle |
| `/projets` | **Pôles & projets** | Groupés sous l’année scolaire |
| `/budgets` | Budgets | Budget « AS 2025-2026 » |
| `/paiements` | Dépenses | Filtre année scolaire + pôle |
| `/paiements/nouveau` | Nouvelle dépense | Types : fiche / reçu / **demande d’achat** |
| `/comptabilite` | Journal des dépenses | Export CSV pour conseil |
| `/parametres` | École | Année scolaire courante + signataires Directeur/Intendant |

Publiques :
- `/signer/:token` — signature bénéficiaire / fournisseur
- `/public/budget/:token` — partage au conseil d’établissement / APE (label UI : « Lien conseil »)

### Workflow demande d’achat (spécifique école)
1. Enseignant crée `type = demande_achat`, statut `brouillon`
2. Passe en `en_attente_validation`
3. Intendant/Directeur valide → peut convertir en dépense réelle (même fiche, statut évolue) ou rejeter (commentaire)
4. Après paiement effectif + signatures → `valide`

Implémentation minimale v1 :
- Pas de table séparée “purchase_requests”
- Utiliser `payments` + champ `type` + statuts
- Boutons Valider / Refuser visibles intendant+admin

---

## 7. Signatures

Signataires internes :
1. Directeur
2. Intendant

Bénéficiaire / fournisseur via lien token.

PDF généré intitulé : **« Justificatif de dépense — [Nom école] »**  
(pas « fiche de paiement ONG »)

---

## 8. IA — prompts adaptés

### categorize-expense
System prompt :
> Tu es un gestionnaire financier d’établissement scolaire francophone. Impute la dépense à UNE ligne du budget annuel (cantine, pédagogie, fonctionnement…). Réponds via l’outil pick_line.

### budget-insights
System prompt :
> Tu es un intendant scolaire. Analyse le budget de l’année : lignes dépassées, postes sous-consommés avant fin d’année scolaire, suggestions concrètes (fournitures, sorties, maintenance). Français, ton professionnel et prudent.

Masquer / ne pas mentionner : cost-share, bailleur, USD, ONG.

---

## 9. Design

- Direction : **scolaire chaleureux institutionnel**
- Couleurs : bleu ardoise + accent ambre doux (éviter violet AI et crème terracotta cliché)
- Typo : Fraunces (titres) + DM Sans (corps) — ou équivalent
- Login : nom de l’école en hero-level + logo
- Sidebar : « BudgetÉcole » en sous-titre produit, nom établissement en titre
- Icônes : pôles cantine/pédagogie/sport compréhensibles

---

## 10. Seed démo

Org `ecole-demo` — « Groupe Scolaire Les Palmiers »
- Année `2025-2026`
- Pôles : Administration, Cantine, Pédagogie, Sport, Maintenance
- Projet : « Sortie musée CM2 »
- Budget annuel XOF avec 5 rubriques
- 6 dépenses (dont 1 demande d’achat en attente)
- Directeur / Intendant renseignés
- Préfixe `ECO-DEP`

---

## 11. Edge functions

Mêmes 6 que l’ONG, adaptées :
- `import-budget` → parse CSV/Excel scolaire (colonnes §5)
- prompts IA scolaires
- `invite-user` → rôles école
- `public-budget-view` inchangé fonctionnellement

---

## 12. Livrables

Identiques au brief ONG :
- App buildable, migrations, edge functions, README, `.env.example`, seed, aucun secret
- Aucune occurrence KPT / Karatou / président-trésorier ONG dans l’UI

---

## 13. Hors scope

- Emploi du temps, notes, vie scolaire pédagogique
- Facturation des frais de scolarité / cantine aux parents (encaissements) — v1 = **dépenses seulement**
- Inventaire stock cantine avancé
- Comptabilité OHADA complète
- App mobile native

---

## 14. Critères d’acceptation

- [ ] Année scolaire courante visible partout (dashboard, nouvelles dépenses)
- [ ] Hiérarchie Année → Pôle → Projet
- [ ] Demande d’achat : création enseignant → validation intendant
- [ ] Catégories 100% scolaires (liste §5)
- [ ] Signataires Directeur + Intendant
- [ ] Import budget CSV scolaire
- [ ] IA utilise prompts scolaires
- [ ] Partage budget « Lien conseil »
- [ ] Multi-tenant RLS org
- [ ] PDF « Justificatif de dépense »
- [ ] Zéro vocabulaire ONG/bailleur dans l’UI

---

## 15. Ordre d’implémentation

1. Auth + organizations + settings_school (année scolaire)
2. Pôles & projets (types annee/pole/projet)
3. Dépenses + documents + PDF
4. Signatures Directeur/Intendant/bénéficiaire
5. Budgets + import CSV + imputation
6. Demande d’achat (statuts)
7. IA + insights
8. Partage public + journal + seed
