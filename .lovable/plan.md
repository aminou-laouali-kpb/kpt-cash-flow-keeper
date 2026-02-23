

# Amelioration du PDF de fiche de paiement

## Objectif

Rendre le PDF professionnel avec le logo de l'association, les signatures reelles (President, Tresoriere, Beneficiaire), un formatage soigne des montants en "Francs CFA", et une mise en page structuree avec encadres et bordures.

## Modifications prevues

### Fichier unique a modifier : `src/lib/generatePaymentPDF.ts`

La fonction `generatePaymentPDF` sera reecrite avec les ameliorations suivantes :

**1. En-tete professionnel avec logo**
- Charger le logo depuis `settings.logo_url` (ou utiliser l'asset local `Cachet_KPT.png` en fallback)
- Afficher le logo centre en haut (environ 25x25mm)
- Nom de l'association en gras sous le logo
- Adresse, telephone et email en ligne sous le nom
- Ligne de separation horizontale epaisse

**2. Titre encadre**
- "FICHE DE PAIEMENT / JUSTIFICATIF INTERNE" dans un rectangle colore (fond gris clair)
- Reference et date affiches en dessous dans un sous-titre

**3. Bloc meta dans un tableau structure**
- Informations meta (Reference, Date, Projet, Lieu, Statut, Version) disposees dans un tableau a 2 colonnes avec bordures legeres
- Utilisation de `doc.rect()` pour les cellules

**4. Sections avec titres encadres**
- Chaque section (Beneficiaire, Details, Observations) aura un titre avec un fond colore
- Contenu aligne dans un format label:valeur avec espacement regulier

**5. Formatage des montants**
- Affichage : `250 000 Francs CFA` au lieu de `250000 XOF`
- Mapping des devises : XOF -> "Francs CFA", EUR -> "Euros", USD -> "Dollars US"
- Utilisation de `toLocaleString("fr-FR")` pour les separateurs de milliers

**6. Section Signatures avec images reelles**
- 3 blocs cote a cote : President, Beneficiaire, Tresoriere
- Charger les images de signature depuis les URLs (settings pour President/Tresoriere, payment_signatures pour Beneficiaire)
- Afficher l'image de signature a l'interieur du cadre si disponible
- Afficher "Non signe" en texte si pas de signature
- La fonction acceptera un parametre supplementaire `beneficiaireSignatureUrl` optionnel

**7. Pied de page**
- Mention legale centree
- Date de generation + reference + version
- Ligne de separation fine au-dessus

### Mise a jour de l'appel dans `src/pages/PaiementDetail.tsx`

- Passer l'URL de signature du beneficiaire a `generatePaymentPDF` pour l'inclure dans le PDF
- La signature est deja disponible via `beneficiaireSig.signature_image_url`

### Fonction utilitaire d'image

- Creer une fonction helper `loadImageAsBase64(url)` qui fetch l'image et la convertit en base64 data URL pour l'integrer dans jsPDF via `doc.addImage()`
- Gestion d'erreur silencieuse : si l'image ne charge pas, on continue sans

## Details techniques

- jsPDF `addImage()` accepte les formats base64, PNG, JPEG
- Pour charger les images distantes (signatures stockees dans le bucket), on utilisera `fetch()` + `FileReader` ou `canvas` pour convertir en base64
- Le logo local (`Cachet_KPT.png`) sera importe directement comme asset statique en fallback

