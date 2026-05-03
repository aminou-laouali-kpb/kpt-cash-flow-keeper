# Édition de paiement + justificatifs remplaçant les signatures

## Contexte

Aujourd'hui :
- La route `/paiements/:id/modifier` existe et pointe vers `PaiementForm`, **mais** le composant ignore le `:id` : il crée toujours un nouveau paiement au lieu de modifier l'existant.
- Le PDF affiche systématiquement 3 cases de signature (Président / Bénéficiaire / Trésorière), même quand un justificatif externe (reçu, facture signée) est déjà joint au paiement.

## 1. Édition d'un paiement existant

### Comportement
- Sur `/paiements/:id/modifier` : pré-remplir le formulaire avec les valeurs existantes du paiement, charger les pièces jointes existantes, et appeler `updatePayment` au lieu de `createPayment` à la soumission.
- Conserver le wizard en 3 étapes mais sauter l'écran « choix du type » (le type est déjà fixé).
- Titre adapté : « Modifier le paiement » + référence affichée.
- Message d'avertissement si la fiche est déjà signée : rappeler que modifier un champ critique invalide la signature du bénéficiaire (logique `signature-invalidation` déjà en place côté DB).
- Les nouveaux fichiers ajoutés s'ajoutent à la liste existante ; possibilité de retirer une pièce jointe (suppression dans `payment_documents` + storage).

### Fichiers modifiés
- `src/pages/PaiementForm.tsx` :
  - Lire `useParams<{ id }>()`. Si `id` présent ⇒ mode édition.
  - Charger le paiement (`usePayment(id)`) + ses `payment_documents` au montage et faire `form.reset(values)`.
  - Sauter l'étape 0 et forcer `paymentType` à la valeur du paiement chargé.
  - À la soumission : si édition, appeler `updatePayment({ id, ...values })`, puis insérer/supprimer les documents modifiés.
- `src/hooks/usePayments.ts` : exporter `isUpdating` (déjà présent dans `updateMutation.isPending`).

## 2. Justificatifs remplaçant les signatures

### Principe
Un justificatif externe (reçu, facture, ticket) téléversé par l'utilisateur peut, s'il est marqué « tient lieu de signature », **remplacer** les signatures dans le PDF — utile quand on a déjà la preuve de paiement signée par le commerçant.

### UI
- Sur la fiche `PaiementDetail`, dans la section Signatures :
  - Nouveau bouton « Ajouter un justificatif tenant lieu de signature » (upload image/PDF).
  - Liste des justificatifs déjà liés au paiement (`payment_documents`), avec aperçu image et bouton de suppression.
  - Si au moins un justificatif est marqué `type_piece = 'justificatif_signature'`, afficher un encart vert « Justificatif fourni — signatures non requises » et masquer les boutons de signature.
- Sur `PaiementForm` (création + édition) : conserver le bloc d'upload existant à l'étape 3, mais ajouter une case à cocher « Ce document tient lieu de signature ».

### PDF
- Dans `generatePaymentPDF.ts` : si la liste des documents contient un justificatif marqué « tient lieu de signature » :
  - Remplacer la zone des 3 cases de signature par **une seule case** « Justificatif joint » contenant l'aperçu de l'image (ou le nom du fichier si PDF) + mention « Ce document tient lieu de signature des parties ».
  - Sinon, conserver le rendu actuel à 3 signatures.

### Base de données
- Ajouter la valeur `justificatif_signature` à l'enum `document_type` (ALTER TYPE).
- Aucune autre table à créer ; on réutilise `payment_documents`.

### Fichiers modifiés
- Migration : `ALTER TYPE document_type ADD VALUE 'justificatif_signature';`
- `src/components/FileUpload.tsx` : option facultative pour exposer un toggle « tient lieu de signature » par fichier.
- `src/pages/PaiementDetail.tsx` : nouvelle sous-section justificatifs dans le bloc Signatures + masquage conditionnel des actions de signature.
- `src/pages/PaiementForm.tsx` : passage du flag à l'insertion dans `payment_documents`.
- `src/lib/generatePaymentPDF.ts` : nouveau paramètre `proofDocuments` (déjà chargés par l'appelant) ; logique conditionnelle dans la section signatures.
- `src/hooks/usePayments.ts` ou nouveau `usePaymentDocuments.ts` : hook pour lister/supprimer les pièces.

## Récap des étapes d'implémentation

1. Migration enum `document_type`.
2. Refacto `PaiementForm.tsx` pour supporter le mode édition (chargement + update).
3. Hook + composant pour gérer les `payment_documents` côté détail.
4. Mise à jour du rendu PDF pour basculer entre signatures et justificatif.
5. Tests manuels : créer une fiche, joindre un justificatif marqué « tient lieu de signature », générer le PDF, modifier le montant et vérifier l'invalidation.
