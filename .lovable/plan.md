

# KPT - Gestion Comptable & Fiches de Paiement

Application web mobile-first en français pour l'association "Karaté Pour Tous" permettant de gérer la comptabilité par projet et générer des fiches de paiement internes avec signatures.

---

## Phase 1 — Fondations & Authentification

- **Connexion admin** par email/mot de passe via Supabase Auth
- **Table de rôles** (admin, comptable, lecture seule) préparée pour le futur
- **Profil utilisateur** basique
- **Layout principal** : sidebar/navigation mobile-first, en français, couleurs sobres bleu/vert

## Phase 2 — Paramètres Association

- Page **Paramètres KPT** avec tous les champs : nom, logo, adresse, téléphone, email
- Upload du **logo** de l'association
- Infos **Président** et **Trésorière** : nom, fonction, upload de signature (image PNG)
- Configuration : devise par défaut (XOF), numérotation auto (KPT-PAY-AAAA-0001), mention légale pied de page
- Stockage des signatures et logo dans Supabase Storage

## Phase 3 — Gestion des Projets

- CRUD projets : nom, code, description, dates, responsable, budget prévisionnel
- Statut projet (Actif / Clôturé)
- Calcul automatique du total des dépenses par projet
- Projet par défaut "Fonctionnement général"
- Vue liste et vue détail avec paiements liés

## Phase 4 — Tableau de Bord

- Statistiques clés : total paiements, montant dépensé (mois/année), fiches brouillon, à re-signer, signées
- Graphique de répartition des dépenses par projet
- Dernières transactions
- Boutons rapides : "Nouveau paiement", "Importer un reçu", "Nouveau projet"

## Phase 5 — Création de Dépenses / Paiements

- Formulaire unique avec choix du type : **importer un reçu** ou **créer une fiche manuelle KPT**
- Tous les champs obligatoires : projet, date, montant, devise, catégorie, mode de paiement, bénéficiaire, motif
- Champs optionnels : téléphone, email, pièce d'identité, lieu, référence transaction, commentaire, motif absence de reçu
- Upload multiple de fichiers (PDF/JPG/PNG) pour les reçus/factures
- Génération automatique de la référence fiche (KPT-PAY-AAAA-0001)

## Phase 6 — Fiche de Paiement KPT (Génération PDF)

- Template professionnel en français avec en-tête KPT (logo, adresse)
- Sections : infos bénéficiaire, détails paiement, justificatifs, observations
- **3 blocs signatures** : Président (auto), Trésorière (auto), Bénéficiaire (en attente ou signé)
- Pied de page avec mention légale, date de génération, numéro de version
- Téléchargement PDF à tout moment (brouillon ou signé)
- Téléchargement DOCX

## Phase 7 — Signature du Bénéficiaire

- **Signature sur place** : canvas de dessin (doigt/souris) intégré dans la fiche
- **Signature à distance** : génération d'un lien sécurisé unique (token)
  - Envoi par email, WhatsApp (message prérempli), ou copie manuelle du lien
  - Page publique sécurisée : résumé de la fiche, confirmation des infos, zone de signature, boutons "Je signe" / "Je refuse"
  - Horodatage, verrouillage après signature
- Invalidation automatique de la signature si modification d'un champ critique (montant, bénéficiaire, date, motif, projet) → statut "À re-signer"
- Possibilité de renvoyer un nouveau lien

## Phase 8 — Versioning & Historique

- Historique des versions (v1, v2, v3…) pour chaque fiche
- Journal : qui a modifié, quand, quels champs, motif optionnel
- Indication si signature invalidée suite à modification
- Journal d'audit complet (création, modifications, signatures, téléchargements)

## Phase 9 — Liste Comptable & Exports

- Tableau des dépenses avec colonnes : Date, Réf, Projet, Bénéficiaire, Catégorie, Mode, Montant, Type de pièce, Statut, Signature
- Recherche + filtres multiples (projet, période, catégorie, mode, statut, bénéficiaire)
- Totaux automatiques
- Export CSV / Excel par période et par projet

## Phase 10 — Bonus

- QR code sur les fiches (lien vers version en ligne)
- Statistiques avancées par projet
- Import CSV de dépenses anciennes
- Impression optimisée A4
- Sauvegarde automatique brouillon
- Catégories de dépenses personnalisables

---

## Stack technique

- **Frontend** : React + TypeScript + Tailwind CSS (mobile-first)
- **Backend** : Supabase (Auth, Database, Storage, Edge Functions)
- **PDF** : jsPDF ou bibliothèque côté edge function
- **DOCX** : docx.js
- **Signature** : react-signature-canvas
- **Liens sécurisés** : tokens UUID stockés en base

