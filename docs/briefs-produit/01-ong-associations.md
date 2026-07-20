# BRIEF AGENT — BudgetTrace ONG

> **À coller tel quel dans un nouvel onglet Cursor pour générer l’app.**  
> Produit : plateforme SaaS de traçabilité budgétaire pour ONG / associations / fondations.

---

## 0. Mission de l’agent

Tu dois créer une application web complète nommée **BudgetTrace ONG** (nom commercial temporaire : `budgettrace-ong`).

Objectif produit : permettre à une ONG de :
1. Structurer ses programmes / sites / projets
2. Importer ou saisir un budget bailleur (rubriques + lignes)
3. Enregistrer chaque dépense avec pièces justificatives
4. Imputer la dépense sur une (ou plusieurs) ligne(s) budgétaire(s) — manuellement ou via IA
5. Faire signer les fiches (président, trésorier, bénéficiaire) via lien public
6. Suivre la consommation budgétaire et partager une vue lecture seule aux bailleurs
7. Exporter PDF / CSV / Excel

**Priorité :** produit commercialisable multi-organisation (pas une instance hardcodée pour une seule ONG).

---

## 1. Référence technique

Si un repo source KPT (Karatou Pour Tous) est fourni :
- Réutilise son architecture : React + Vite + TS + shadcn + Supabase + Edge Functions
- Extrais le code métier générique
- Supprime tout branding KPT hardcodé (`Karatou Pour Tous`, logo Cachet_KPT, préfixe `KPT-PAY`, catégories sportives, MyNITA comme label exclusif)

Si aucun repo n’est fourni :
- Recrée la même stack et le même schéma métier décrit ci-dessous

Stack imposée :
- Frontend : React 18, Vite, TypeScript, Tailwind, shadcn/ui, React Query, React Router, Recharts, Zod, react-hook-form
- Backend : Supabase (Auth email, Postgres, RLS, Storage privé + URLs signées, Edge Functions Deno)
- Exports : jsPDF + jspdf-autotable, xlsx, file-saver
- Signatures : react-signature-canvas
- IA : edge functions appelant un gateway LLM (compatible OpenAI tools/function calling)

Langue UI : **français** (tout le produit).

---

## 2. Positionnement & personas

### Positionnement
« La plateforme qui lie chaque franc dépensé au budget bailleur, avec justificatif signé et preuve partageable. »

### Personas
| Rôle produit | Rôle technique | Besoins |
|--------------|----------------|---------|
| Directeur / Coordinateur | `admin` | Paramétrage org, utilisateurs, validation globale |
| Comptable / Admin finance | `comptable` | Saisie dépenses, imputation, budgets, exports |
| Chef de projet / terrain | `chef_projet` | Créer dépenses liées à son projet, joindre reçus, consulter budget |
| Lecteur bailleur / board | `lecture_seule` | Voir dashboards, budgets, paiements sans modifier |
| Bénéficiaire externe | anon via token | Signer une fiche de paiement |
| Bailleur externe | anon via token | Consulter un budget partagé |

---

## 3. Multi-tenant (OBLIGATOIRE)

L’app KPT d’origine est mono-tenant. Tu dois introduire :

### Table `organizations`
```sql
organizations (
  id uuid PK,
  slug text UNIQUE NOT NULL,          -- ex: mon-ong
  nom text NOT NULL,
  logo_url text,
  plan text DEFAULT 'starter',        -- starter | pro | enterprise
  created_at timestamptz DEFAULT now()
)
```

### Règles
- Toutes les tables métier portent `organization_id` (sauf éventuellement tables de référence globales)
- Un utilisateur appartient à une org via `organization_members (organization_id, user_id, role)`
- RLS : l’utilisateur ne voit que les données de son/ses organisation(s)
- Branding dynamique depuis `organizations` + `settings_organization` (plus de singleton hardcodé KPT)
- Routes publiques : `/o/:slug/login` optionnel ; sinon login unique puis résolution de l’org du membre
- Numérotation paiements : `{prefixe}-{YYYY}-{####}` par organisation

### Paramètres org (`settings_organization`)
- nom, adresse, téléphone, email
- `signataire_1_nom`, `signataire_1_fonction` (défaut : Président)
- `signataire_2_nom`, `signataire_2_fonction` (défaut : Trésorier)
- `devise_defaut` (XOF | EUR | USD | CFA)
- `prefixe_numerotation`
- `mention_legale`
- `logo_url`, signatures image des 2 signataires

---

## 4. Modèle de données (schéma cible)

### Enums
```text
app_role: admin | comptable | chef_projet | lecture_seule
project_type: programme | site | standard
project_status: actif | cloture
payment_status: brouillon | en_attente_signature | signe | a_re_signer
payment_type: recu_importe | fiche_manuelle
payment_mode: especes | virement | cheque | mobile_money | carte_bancaire | autre
signer_type: signataire_1 | signataire_2 | beneficiaire
allocation_source: ia_auto | manual | rule
budget_status: draft | active | archived
```

### Catégories de dépense (ONG) — enum ou table seed
```text
fournitures, transport, restauration, hebergement, communication,
equipement, location, honoraires, frais_bancaires, assurance,
formation, evenement, personnel, subvention_redistribuee, autre
```
*(pas de `equipement_sportif` / `location_salle` hardcodés sport)*

### Tables principales
1. `organizations`, `organization_members`, `profiles`
2. `projects` : nom, code, description, dates, responsable, budget_previsionnel, statut, parent_id, ville, type_projet, organization_id
3. `budgets` : project_id (souvent un programme), devise, taux_change_local, montant_total, montant_cost_share, status, source_file_*, organization_id
4. `budget_categories` : arbre (rubrique / sous_categorie), code, libelle, montant_prevu, ordre
5. `budget_lines` : libelle, description, cost_unitaire, quantite, montant_prevu, cost_share, villes[], justification, category_id
6. `payments` : référence auto, type, project_id, date, montant, devise, categorie, mode, bénéficiaire*, motif, lieu, statut, version_courante, organization_id
7. `payment_documents`, `payment_signatures`, `signature_requests`, `payment_versions`, `audit_logs`
8. `payment_budget_allocations` : payment_id, budget_line_id, montants (devise paiement + devise budget), confidence, source, reasoning, validated_*
9. `categorization_rules` : pattern → budget_line_id (apprentissage)
10. `budget_insights` : cache JSON IA
11. `budget_share_links` : token, expires_at, allow_export, revoked_at, label, view_count

### Vues
- `v_budget_line_consumption`
- `v_budget_summary`

### Storage
- Bucket privé `org-files` (chemins préfixés `{organization_id}/...`)
- URLs signées côté client

---

## 5. Modules & écrans (routes)

### Authentifiées (layout sidebar)
| Route | Écran | Contenu minimal |
|-------|-------|-----------------|
| `/` | Dashboard | KPIs : nb paiements, signés, brouillons, à re-signer ; total dépensé ; dépenses par projet ; 5 derniers paiements ; CTA nouveau paiement / importer reçu / nouveau projet |
| `/projets` | Liste projets | Filtres type/statut ; hiérarchie programme → enfants visible |
| `/projets/nouveau`, `/projets/:id`, `/projets/:id/modifier` | CRUD projet | Champs type_projet, parent, ville, dates, responsable |
| `/budgets` | Liste budgets | Statut, montant, % consommé |
| `/budgets/nouveau` | Import budget | Upload Excel + mapping / preview avant commit |
| `/budgets/:id` | Détail budget | Arbre rubriques/lignes, consommation, insights IA, partage lien, export |
| `/paiements` | Liste | Filtres projet/statut/dates/recherche |
| `/paiements/nouveau`, `/paiements/:id`, `/paiements/:id/modifier` | CRUD paiement | Formulaire complet + upload pièces |
| `/paiements/:id` (détail) | Workflow | Statuts, signatures, imputation manuelle + IA, PDF, historique versions |
| `/comptabilite` | Grand livre | Filtres + export CSV |
| `/parametres` | Settings org | Identité, signataires, devise, préfixe, invitations membres, rôles |

### Publiques
| Route | Contenu |
|-------|---------|
| `/login` | Auth email/password |
| `/set-password` | Première connexion invite |
| `/signer/:token` | Signature bénéficiaire (canvas) + refus motiver |
| `/public/budget/:token` | Vue budget lecture seule (consommation + allocations) |

Sidebar : logo org dynamique + nom org. Menu : Tableau de bord, Projets, Budgets, Paiements, Comptabilité, Paramètres.

---

## 6. Workflows métier à implémenter précisément

### A. Création paiement
1. Générer référence via RPC `generate_payment_reference(organization_id)`
2. Statut initial `brouillon`
3. Upload pièces → `payment_documents`
4. Option type `recu_importe` : forcer au moins 1 document

### B. Signature
1. Admin/comptable envoie lien (`signature_requests` token, expire 7j)
2. Page publique charge via RPC `get_signature_request_by_token`
3. Signer via `sign_payment_via_token` OU refuser via `refuse_signature_via_token`
4. Signataires internes (1 et 2) : canvas ou upload image depuis paramètres
5. Quand signatures requises OK → statut `signe`
6. Modification d’un paiement signé → invalider signatures + statut `a_re_signer` + version

### C. Imputation budgétaire
1. Bouton **Suggérer (IA)** → edge `categorize-expense` (auth JWT)
2. Bouton **Imputer manuellement** (admin/comptable) → dialog :
   - budget actif
   - rubrique
   - ligne (filtre ville projet optionnel)
   - montant alloué (reste à imputer prérempli)
   - commentaire → `reasoning`
   - `source = manual`, `confidence = 1`, validated_*
3. Multi-lignes autorisé ; afficher « X / Y imputé »
4. Batch : edge `auto-categorize-batch` pour paiements non imputés d’un budget/projet

### D. Import budget
- Edge `import-budget` : parse Excel structure bailleur générique
- Accepter au minimum :
  - format type “Project Costs USD” (rubrique numérotée + lignes + subtotals + cost share)
  - OU CSV simple colonnes : `code_rubrique, rubrique, libelle_ligne, quantite, cout_unitaire, montant, cost_share, villes, justification`
- Preview UI avant écriture DB
- Status `draft` puis activation `active` (1 budget actif recommandé par programme, mais pas bloquant techniquement)

### E. Insights IA
- Edge `budget-insights` : synthèse, alertes dépassement (>100%), idées pour lignes sous-consommées (<50%) avec temps restant
- Prompt système : « contrôleur de gestion d’ONG francophone »
- Cache dans `budget_insights`

### F. Partage budget
- Créer lien token (admin/comptable)
- Vue publique + compteur vues
- Révocation possible
- Export optionnel selon `allow_export`

---

## 7. Edge functions à livrer

| Function | Auth | Rôle |
|----------|------|------|
| `invite-user` | JWT admin | Invite email + rattache à org + rôle |
| `import-budget` | JWT admin/comptable | Parse fichier → catégories/lignes |
| `categorize-expense` | JWT authentifié | Imputation IA 1 paiement |
| `auto-categorize-batch` | JWT authentifié | Batch imputation |
| `budget-insights` | JWT authentifié | Analyse budget |
| `public-budget-view` | token query | Données budget public |

Sécurité : jamais de service role côté client. RLS stricte. RPCs signature en SECURITY DEFINER bornées au token.

---

## 8. UI / Design

- Pas de branding violet générique AI
- Direction visuelle : **institutionnel ONG** — bleu profond / vert confiance, typographie claire (ex. Source Sans 3 + Source Serif 4 ou équivalent Google Fonts)
- Fond avec léger dégradé / motif papier très discret (pas flat blanc nu)
- Logo org hero dans sidebar + page login
- Responsive desktop + mobile
- Composants shadcn ; pas de cards inutiles hors listes/stats dashboard
- États vides utiles avec CTA
- StatusBadge pour statuts paiement/budget

---

## 9. Contenu seed (démo)

Créer une org démo `demo-ong` avec :
- 1 programme « Santé communautaire »
- 2 sites (Abidjan, Bouaké)
- 1 budget actif USD avec 4 rubriques / ~12 lignes
- 5 paiements (mix brouillon / signé)
- 2 allocations
- Settings : devise XOF, préfixe `ONG-PAY`, signataires Président/Trésorier

Compte seed (documenté dans README) : email + mot de passe démo.

---

## 10. Livrables attendus

1. Repo app complète buildable (`npm i && npm run dev`)
2. Migrations Supabase + `config.toml` + edge functions
3. Types générés / maintenus dans `src/integrations/supabase/types.ts`
4. README : setup Supabase, variables d’env, déploiement
5. `.env.example` : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
6. Pas de secrets commités
7. Tests smoke Vitest (au moins utils + 1 hook critique mocké si possible)

---

## 11. Hors scope (ne pas faire)

- Comptabilité en partie double / plan comptable OHADA complet
- Paie / RH
- Multi-devises temps réel marché (taux manuel suffit)
- Application mobile native
- Facturation SaaS (Stripe) — prévoir seulement le champ `plan` sur organizations
- Traduction i18n (FR only pour v1)

---

## 12. Critères d’acceptation

- [ ] Une org A ne peut pas lire les données d’une org B (RLS testée)
- [ ] Création paiement → référence unique auto
- [ ] Upload pièce + génération PDF fiche
- [ ] Lien signature public fonctionne sans compte
- [ ] Imputation manuelle multi-lignes + récap X/Y
- [ ] Suggestion IA écrit une allocation `ia_auto`
- [ ] Import budget Excel/CSV crée rubriques + lignes
- [ ] Dashboard et comptabilité affichent totaux cohérents
- [ ] Partage budget public + révocation
- [ ] Paramètres org : logo, signataires, devise, préfixe
- [ ] Aucune occurrence de « KPT » / « Karatou » dans le code ou l’UI

---

## 13. Première commande à exécuter (si repo KPT fourni)

1. Dupliquer / forker le repo
2. Renommer package et titres
3. Introduire `organizations` + migration RLS
4. Remplacer settings singleton
5. Généraliser catégories et labels
6. Brancher branding dynamique
7. Seed démo
8. Vérifier les 11 critères d’acceptation

Si tu démarres de zéro : implémenter dans l’ordre modules Auth → Org/Settings → Projets → Paiements/Signatures → Budgets/Imputation → IA → Partage → Comptabilité.
