# BRIEF AGENT — BudgetCampus

> **À coller tel quel dans un nouvel onglet Cursor pour générer l’app.**  
> Produit : pilotage budgétaire des dépenses pour universités, facultés, laboratoires et projets de recherche.

---

## 0. Mission de l’agent

Tu dois créer une application web complète nommée **BudgetCampus** (`budget-campus`).

Objectif produit : permettre à une université (ou une composante) de :
1. Structurer Faculté → Département / Labo → Projet / Convention
2. Gérer plusieurs budgets en parallèle (dotation, convention recherche, fond propre)
3. Enregistrer dépenses / missions / achats avec pièces
4. Imputer sur centres de coût / lignes budgétaires (manuel + IA)
5. Circuit de validation multi-niveaux (porteur → gestionnaire → ordonnateur)
6. Partager un budget à un financeur / tutelle via lien
7. Exporter états PDF / CSV / Excel

**Différence clé vs ONG/École :** multi-budgets simultanés, centres de coût, conventions de recherche, validation hiérarchique plus riche, vocabulaire académique.

---

## 1. Référence technique

Réutiliser (si fourni) le repo KPT :
- Stack React + Vite + TS + shadcn + Supabase + Edge Functions
- Remplacer domaine ONG par domaine universitaire ci-dessous
- Multi-tenant obligatoire

Langue UI : **français**.

---

## 2. Positionnement & personas

### Positionnement
« Le contrôle de gestion des dépenses universitaires : conventions, labos et facultés, une seule traçabilité. »

### Personas / rôles
| Persona | Rôle | Droits principaux |
|---------|------|-------------------|
| Admin DSI / Admin finance centrale | `admin` | Org, users, paramètres, tous budgets |
| Gestionnaire financier composante | `gestionnaire` | CRUD dépenses/budgets de son périmètre |
| Ordonnateur / Doyen / Directeur labo | `ordonnateur` | Valider dépenses, signatures |
| Porteur de projet / Chercheur | `porteur` | Créer dépenses sur ses projets, voir son budget |
| Contrôle de gestion / tutelle | `lecture_seule` | Lecture + exports |
| Prestataire / missionnaire | anon token | Signer justificatif |

### Périmètre d’accès (important)
Ajouter `project_members (project_id, user_id, role_in_project)` :
- Un `porteur` ne voit que les projets où il est membre
- `gestionnaire` / `ordonnateur` / `admin` : accès large (toute l’org) en v1
- RLS : combiner `organization_id` + membership projet pour rôle `porteur`

---

## 3. Multi-tenant & settings

```text
organizations = université ou composante (ex: « Université X — Faculté des Sciences »)
```

`settings_campus` :
- nom, logo, adresse, tutelle, SIRET/identifiant (texte libre)
- `ordonnateur_nom`, `ordonnateur_fonction` (défaut : Ordonnateur)
- `gestionnaire_nom`, `gestionnaire_fonction` (défaut : Gestionnaire)
- `devise_defaut` (EUR | XOF | USD | MAD)
- `prefixe_numerotation` (ex: `UNIV-DEP`)
- `exercice_courant` (ex: `2026`) — année civile / exercice budgétaire
- `mention_legale`
- `validation_levels` int DEFAULT 2 — (1=gestionnaire seul, 2=gestionnaire+ordonnateur)

---

## 4. Structure opérationnelle

Table `projects`, labels UI :

| `type_projet` | Label UI | Exemple |
|---------------|----------|---------|
| `composante` | Composante / Faculté | Faculté des Sciences |
| `unite` | Département / Laboratoire | Labo Informatique |
| `projet` | Projet / Convention | ANR-2025-IA-Santé |
| `axe` | Axe / Work package (optionnel) | WP2 — Collecte données |

Hiérarchie typique :
```text
composante
  └── unite (labo)
        └── projet (convention)
              └── axe (optionnel)
```

Champs additionnels `projects` :
- `code` (obligatoire, ex: `LAB-INFO`, `ANR-25-42`)
- `financeur` text nullable (ANR, UE, fond propre, ministères…)
- `reference_convention` text nullable
- `date_debut`, `date_fin`
- `ville` / `campus` text nullable

---

## 5. Budgets — multi-enveloppes

### Types de budget (champ `budgets.kind`)
```text
dotation | convention | fond_propre | autre
```

### Règles
- Plusieurs budgets `active` possibles **par projet/convention**
- Afficher clairement `kind` + financeur
- Cost-share : utile pour conventions internationales → **garder et afficher** si `kind = convention`
- Devises : EUR par défaut ; taux de change manuel vers devise locale optionnel (`taux_change_local`)

### Import
Deux formats supportés :
1. **CSV campus** :
```csv
code_rubrique,rubrique,code_ligne,libelle_ligne,montant_prevu,centre_cout,financeur_notes
```
2. **Excel bailleur recherche** (compatible structure type project costs) — réutiliser parseur ONG si présent, labels UI « Import convention »

### Centres de coût
- Sur `budget_lines`, ajouter `centre_cout text` nullable
- Filtre imputation par centre de coût
- Affichage dans grand livre

---

## 6. Dépenses & validation

### Enums dépenses
```text
payment_status:
  brouillon
  soumis                 -- porteur a soumis
  en_attente_gestionnaire
  en_attente_ordonnateur
  valide
  refuse
  a_re_signer

payment_type:
  fiche_manuelle
  recu_importe
  note_frais             -- mission / déplacement
  bon_commande

payment_mode:
  especes | virement | cheque | carte_bancaire | mandat_administratif | autre
```

### Catégories (université)
```text
missions_deplacement
hebergement
restauration
inscription_conference
documentation_ouvrages
consommables_labo
equipement_scientifique
equipement_informatique
logiciels_licences
prestations_service
sous_traitance
personnel_vacataire
communication_scientifique
frais_publication
frais_administratifs
autre
```

### Champs paiement additionnels
- `centre_cout` text nullable
- `exercice` text (copié settings à la création)
- `motif_refus` text nullable
- `submitted_at`, `validated_at` timestamptz nullable

### Circuit de validation (v1)
```text
porteur: brouillon → soumis
gestionnaire: soumis → en_attente_ordonnateur | refuse
ordonnateur: en_attente_ordonnateur → valide | refuse
si validation_levels = 1: gestionnaire peut passer directement à valide
```

Signatures :
- Après `valide`, option d’envoyer signature bénéficiaire (note de frais)
- Signataires internes : Gestionnaire + Ordonnateur (images paramètres)
- Statuts signature restent sur tables `payment_signatures` / `signature_requests`

---

## 7. Modules & écrans

| Route | Label | Spécificité |
|-------|-------|-------------|
| `/` | Pilotage | Totaux par kind de budget ; dépenses en attente de validation (file porteur/gestionnaire) |
| `/projets` | **Structure** | Arbre composante / labo / projet |
| `/projets/:id` | Fiche | Membres projet, budgets liés, dépenses |
| `/budgets` | Enveloppes | Filtres kind + statut + projet |
| `/budgets/nouveau` | Import / création | kind obligatoire |
| `/budgets/:id` | Suivi | Consommation, centres de coût, IA, partage financeur |
| `/paiements` | Dépenses | File « à valider » pour gestionnaire/ordonnateur |
| `/paiements/nouveau` | Saisie | Types note_frais / bon_commande / reçu |
| `/comptabilite` | Grand livre | Filtres centre_cout, exercice, financeur |
| `/parametres` | Établissement | Exercice, niveaux validation, signataires, membres |

Publiques :
- `/signer/:token`
- `/public/budget/:token` — label « Lien financeur / tutelle »

Widget dashboard obligatoire :
- **File de validation** : compteur des dépenses selon le rôle connecté

---

## 8. IA

### categorize-expense
> Tu es un gestionnaire financier d’université. Impute la dépense (mission, labo, convention) à UNE ligne budgétaire. Tiens compte du centre de coût, du libellé mission/motif et du projet. Outil pick_line.

### budget-insights
> Tu es contrôleur de gestion universitaire. Analyse enveloppes (dotation vs convention) : risques de sous-consommation avant fin de convention, dépassements, redéploiements possibles entre lignes d’une même rubrique. Français académique précis.

Apprentissage : `categorization_rules` inchangé.

---

## 9. Design

- Direction : **académique sobre**
- Couleurs : bleu nuit + gris pierre + accent émeraude discret
- Typo : Literata (titres) + IBM Plex Sans (corps)
- Éviter look “startup purple”
- Login : nom établissement hero + sous-titre BudgetCampus
- Tableaux denses OK sur grand livre (usage pro)

---

## 10. Seed démo

Org `univ-demo` — « Université Démo — Faculté des Sciences »
- Composante FS
- Unité Labo Info
- Projet convention `ANR-2025-DEMO`
- 2 budgets active : dotation EUR + convention EUR
- Centres de coût : `CC-LAB`, `CC-MIS`
- 8 dépenses : mix soumis / en_attente_ordonnateur / valide
- 3 project_members (porteur)
- Préfixe `UNIV-DEP`, exercice `2026`

---

## 11. Edge functions

| Function | Adaptation |
|----------|------------|
| `invite-user` | Rôles campus + org member |
| `import-budget` | CSV campus + Excel convention |
| `categorize-expense` | Prompt univ + centre_cout |
| `auto-categorize-batch` | Idem |
| `budget-insights` | Prompt contrôle de gestion univ |
| `public-budget-view` | Inchangé |

Option v1.1 (hors scope strict) : notification email validation — ne pas bloquer v1.

---

## 12. Livrables

App complète, migrations, RLS multi-tenant + project membership porteur, edge functions, README, `.env.example`, seed, zéro branding KPT.

---

## 13. Hors scope

- Scolarité / inscriptions étudiants
- Paie permanente des enseignants
- GED documentaire complète hors pièces de dépense
- Intégration ERP universitaire (SIFAC, etc.)
- Multi-langue
- Facturation SaaS

---

## 14. Critères d’acceptation

- [ ] Arbre Composante → Unité → Projet visible
- [ ] Plusieurs budgets active (dotation + convention) sur un même projet
- [ ] Champ `kind` + financeur affichés
- [ ] Centres de coût sur lignes et dépenses
- [ ] Circuit porteur → gestionnaire → ordonnateur fonctionnel
- [ ] Rôle `porteur` limité à ses projets (RLS)
- [ ] Types note_frais et bon_commande
- [ ] File « à valider » sur dashboard selon rôle
- [ ] Import CSV campus
- [ ] Partage public financeur
- [ ] IA prompts universitaires
- [ ] Aucun vocabulaire ONG/école primaire dans l’UI

---

## 15. Ordre d’implémentation

1. Auth + org + settings_campus + rôles
2. Structure projets + project_members + RLS porteur
3. Budgets multi-kind + import CSV
4. Dépenses + circuit validation
5. Signatures + PDF « Justificatif de dépense universitaire »
6. Imputation + IA + insights
7. Grand livre (centre de coût) + partage + seed
