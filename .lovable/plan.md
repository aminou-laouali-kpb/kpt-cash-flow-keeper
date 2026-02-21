

# Plan de finalisation complet de l'application KPT

## Etat actuel

La Phase 1 est terminee :
- Authentification (login/signup) via email/mot de passe
- Layout principal avec sidebar responsive
- Tables de base : profiles, user_roles, settings_association
- Bucket de stockage kpt-files
- Pages placeholders pour Projets, Paiements, Comptabilite, Parametres

## Phase 2 -- Page Parametres Association

Construire la page complete des parametres avec formulaire et upload.

**Composants a creer :**
- `src/pages/Parametres.tsx` : refonte complete avec formulaire React Hook Form + Zod
  - Section "Informations generales" : nom, adresse, telephone, email
  - Section "Logo" : upload image avec preview, stockage dans le bucket kpt-files
  - Section "President" : nom, fonction, upload signature PNG avec preview
  - Section "Tresoriere" : nom, fonction, upload signature PNG avec preview
  - Section "Configuration" : devise par defaut (select XOF/EUR/USD), prefixe numerotation, mention legale (textarea)
- `src/hooks/useSettings.ts` : hook pour charger/sauvegarder les settings (upsert singleton)

**Logique :**
- Au premier chargement, si aucun enregistrement n'existe dans settings_association, en creer un avec les valeurs par defaut
- Upload des fichiers vers kpt-files/logo/ et kpt-files/signatures/
- Preview des images uploadees avant sauvegarde

## Phase 3 -- Gestion des Projets

**Migration SQL :**
- Creer la table `projects` : id, nom, code, description, date_debut, date_fin, responsable, budget_previsionnel, statut (enum: actif/cloture), created_by, created_at, updated_at
- RLS : lecture pour authenticated, CRUD pour admin/comptable
- Inserer un projet par defaut "Fonctionnement general"

**Composants a creer :**
- `src/pages/Projets.tsx` : refonte avec liste des projets (cards), bouton "Nouveau projet"
- `src/pages/ProjetForm.tsx` : formulaire creation/edition d'un projet
- `src/pages/ProjetDetail.tsx` : vue detail avec infos + liste des paiements lies
- `src/hooks/useProjects.ts` : hook CRUD avec React Query

**Routes a ajouter dans App.tsx :**
- `/projets/nouveau`
- `/projets/:id`
- `/projets/:id/modifier`

## Phase 4 -- Tableau de Bord dynamique

**Refonte de `src/pages/Dashboard.tsx` :**
- Requetes vers payments et projects pour calculer les stats reelles
- Statistiques : total paiements, montant depense (mois/annee), fiches brouillon, a re-signer, signees
- Graphique repartition par projet avec Recharts (deja installe)
- Liste des 5 dernieres transactions
- Boutons rapides fonctionnels (deja en place, juste les liens)

## Phase 5 -- Creation de Depenses / Paiements

**Migration SQL :**
- Creer les enums : `payment_status` (brouillon, en_attente_signature, signe, a_re_signer), `payment_type` (recu_importe, fiche_manuelle), `expense_category`, `payment_mode`
- Creer la table `payments` : id, reference, type, project_id (FK), date_paiement, montant, devise, categorie, mode_paiement, beneficiaire_nom, beneficiaire_telephone, beneficiaire_email, beneficiaire_adresse, beneficiaire_piece_type, beneficiaire_piece_numero, motif, lieu, reference_transaction, commentaire, personne_effectuant, motif_absence_recu, autorisation_reference, statut, version_courante, created_by, created_at, updated_at
- Creer la table `payment_documents` : id, payment_id (FK), file_url, file_name, file_type, type_piece (facture/recu/autre), created_at
- RLS pour les deux tables
- Fonction SQL `generate_payment_reference()` qui incremente prochain_numero dans settings_association

**Composants a creer :**
- `src/pages/PaiementForm.tsx` : formulaire complet en etapes
  - Etape 1 : choix du type (importer recu ou creer fiche manuelle)
  - Etape 2 : champs obligatoires (projet, date, montant, devise, categorie, mode, beneficiaire, motif)
  - Etape 3 : champs optionnels
  - Etape 4 : upload documents (si recu) ou confirmation (si fiche manuelle)
- `src/pages/PaiementDetail.tsx` : vue detail d'un paiement avec toutes les infos
- `src/pages/Paiements.tsx` : refonte avec liste des paiements, filtres de base
- `src/hooks/usePayments.ts` : hook CRUD
- `src/components/FileUpload.tsx` : composant d'upload multiple avec preview

**Routes :**
- `/paiements/nouveau`
- `/paiements/:id`
- `/paiements/:id/modifier`

## Phase 6 -- Generation PDF de la Fiche de Paiement

**Dependance a installer :** `jspdf` (generation PDF cote client)

**Composants a creer :**
- `src/lib/generatePaymentPDF.ts` : fonction de generation du PDF
  - En-tete avec logo KPT, nom, adresse, telephone, email
  - Titre "FICHE DE PAIEMENT / JUSTIFICATIF INTERNE"
  - Bloc meta : reference, date, projet, lieu, statut
  - Section 1 : Informations du beneficiaire
  - Section 2 : Details du paiement
  - Section 3 : Justificatifs / observations
  - Section 4 : 3 blocs signatures (President auto, Beneficiaire, Tresoriere auto)
  - Pied de page : mention legale, date generation, version
- `src/components/PaymentPreview.tsx` : apercu HTML de la fiche dans l'app
- Boutons "Telecharger PDF" et "Telecharger DOCX" sur la page detail

**Dependance supplementaire :** `docx` pour la generation Word

## Phase 7 -- Signature du Beneficiaire

**Migration SQL :**
- Creer la table `payment_signatures` : id, payment_id (FK), signer_type (president/tresoriere/beneficiaire), signer_name, signature_image_url, signed_at, ip_address, is_valid
- Creer la table `signature_requests` : id, payment_id (FK), token (UUID unique), status (pending/signed/refused/expired), sent_via (email/whatsapp/manual), refusal_reason, created_at, expires_at, signed_at
- RLS : les tokens permettent l'acces public en lecture pour la page de signature

**Dependance :** `react-signature-canvas`

**Composants a creer :**
- `src/components/SignatureCanvas.tsx` : composant de dessin de signature (doigt/souris)
- `src/components/SignatureDialog.tsx` : dialogue pour signature sur place
- `src/components/SendSignatureLink.tsx` : dialogue pour envoyer le lien (email, WhatsApp, copier)
- `src/pages/SignaturePage.tsx` : page publique securisee par token
  - Resume de la fiche
  - Confirmation des infos beneficiaire
  - Zone de signature
  - Boutons "Je signe" / "Je refuse"
- Route publique `/signer/:token` (hors ProtectedRoute)

**Logique d'invalidation :**
- Hook dans usePayments qui detecte les modifications de champs critiques (montant, beneficiaire_nom, date_paiement, motif, project_id)
- Si modifie et signe : invalider la signature beneficiaire, passer statut a "a_re_signer"

## Phase 8 -- Versioning et Historique

**Migration SQL :**
- Creer la table `payment_versions` : id, payment_id (FK), version_number, data (JSONB snapshot), modified_by, modified_at, modification_reason, fields_changed (text[]), signature_invalidated (boolean)
- Creer la table `audit_logs` : id, entity_type, entity_id, action (creation/modification/signature/telechargement/envoi_lien), performed_by, details (JSONB), created_at
- Trigger SQL pour creer automatiquement une version a chaque UPDATE sur payments

**Composants a creer :**
- `src/components/PaymentHistory.tsx` : timeline des versions avec diff
- `src/components/AuditLog.tsx` : journal d'audit sur la page detail
- Integration dans PaiementDetail.tsx

## Phase 9 -- Liste Comptable et Exports

**Refonte de `src/pages/Comptabilite.tsx` :**
- Tableau complet avec colonnes : Date, Ref, Projet, Beneficiaire, Categorie, Mode, Montant, Type de piece, Statut, Signature
- Filtres multiples : projet, periode (date debut/fin), categorie, mode de paiement, statut, beneficiaire
- Recherche textuelle
- Totaux automatiques en bas du tableau
- Boutons d'export CSV et Excel

**Composants a creer :**
- `src/components/PaymentFilters.tsx` : barre de filtres
- `src/components/PaymentTable.tsx` : tableau reutilisable
- `src/lib/exportUtils.ts` : fonctions d'export CSV/Excel
- `src/components/StatusBadge.tsx` : badge de statut colore (Brouillon, Signee, A re-signer, En attente)

## Sequence d'implementation

L'implementation se fera dans cet ordre car chaque phase depend de la precedente :

1. Phase 2 (Parametres) -- prerequis pour les signatures auto
2. Phase 3 (Projets) -- prerequis pour les paiements
3. Phase 5 (Paiements) -- coeur de l'application
4. Phase 7 (Signatures) -- depend des paiements
5. Phase 8 (Versioning) -- depend des paiements et signatures
6. Phase 6 (PDF/DOCX) -- depend de tout le reste
7. Phase 4 (Dashboard) -- agit en lecture sur toutes les autres tables
8. Phase 9 (Comptabilite/Exports) -- agit en lecture + export

## Details techniques

**Migrations SQL totales :** 4 migrations
1. Table projects + projet par defaut
2. Tables payments + payment_documents + enums + fonction reference
3. Tables payment_signatures + signature_requests + RLS publique pour tokens
4. Tables payment_versions + audit_logs + triggers

**Nouvelles dependances NPM :**
- `jspdf` -- generation PDF
- `docx` -- generation DOCX
- `file-saver` -- telechargement fichiers
- `react-signature-canvas` + `@types/react-signature-canvas` -- canvas de signature

**Nouveaux fichiers (environ 25) :**
- 8 pages (refonte + nouvelles)
- 8 composants metier
- 4 hooks personnalises
- 3 utilitaires (PDF, DOCX, export)
- Routes mises a jour dans App.tsx

**Securite :**
- RLS sur toutes les nouvelles tables
- Page de signature publique securisee par token UUID avec expiration
- Validation Zod sur tous les formulaires
- Aucune donnee sensible cote client

