

# Ajouter un canvas de signature pour le President et la Tresoriere dans les Parametres

## Contexte

Actuellement, les signatures du president et de la tresoriere ne peuvent etre ajoutees que par upload d'image dans la page Parametres. L'utilisateur souhaite pouvoir dessiner directement la signature (comme pour le beneficiaire) dans les parametres.

## Solution

Remplacer le composant `ImageUpload` pour les signatures du president et de la tresoriere par un composant hybride qui offre deux options :
1. **Dessiner la signature** via le composant `SignatureCanvas` existant
2. **Importer une image** via upload de fichier (fonctionnalite actuelle conservee)

## Modifications prevues

### Fichier : `src/pages/Parametres.tsx`

1. **Importer** le composant `SignatureCanvas` existant
2. **Creer un composant `SignatureUpload`** qui remplace `ImageUpload` pour les sections signature. Ce composant affichera :
   - La signature actuelle si elle existe (avec bouton supprimer)
   - Deux onglets ou boutons : "Dessiner" et "Importer une image"
   - Le mode "Dessiner" affiche le `SignatureCanvas` ; a la validation, l'image base64 est uploadee dans le storage puis l'URL est sauvegardee dans les settings
   - Le mode "Importer" garde le comportement actuel (input file)
3. **Remplacer** les deux appels `ImageUpload` pour les signatures president et tresoriere par le nouveau composant `SignatureUpload`
4. Le composant `ImageUpload` pour le **logo** reste inchange

### Flux technique

```text
Utilisateur clique "Dessiner"
  → SignatureCanvas s'affiche
  → Utilisateur dessine et valide
  → Le dataURL (base64) est converti en Blob
  → Upload vers le storage (kpt-files/signatures/...)
  → URL publique recuperee
  → updateSettings({ president_signature_url: url })

Utilisateur clique "Importer"
  → Input file classique (comportement actuel)
  → Upload + updateSettings (inchange)
```

### Composant SignatureUpload (nouveau, inline dans Parametres.tsx)

- Props : `label`, `currentUrl`, `onUpload (file: File) => Promise<void>`, `onDrawn (dataUrl: string) => Promise<void>`
- Etat local : `mode` ("view" | "draw" | "upload"), `preview`
- En mode "view" : affiche la signature actuelle ou "Non configuree", avec deux boutons d'action
- En mode "draw" : affiche `SignatureCanvas`, a la validation appelle `onDrawn`
- En mode "upload" : affiche l'input file, appelle `onUpload`

### Handlers dans Parametres

Ajouter deux handlers pour la signature dessinee :

```text
handlePresidentSignatureDrawn(dataUrl):
  → fetch(dataUrl) → blob
  → upload blob vers storage
  → updateSettings({ president_signature_url: url })

handleTresoriereSignatureDrawn(dataUrl):
  → meme logique
```

## Fichiers modifies

- `src/pages/Parametres.tsx` : ajout du composant `SignatureUpload` et des handlers pour signatures dessinees

## Fichiers non modifies

- `src/components/SignatureCanvas.tsx` : reutilise tel quel
- `src/hooks/useSettings.ts` : la fonction `uploadFile` existante sera reutilisee pour uploader le blob

