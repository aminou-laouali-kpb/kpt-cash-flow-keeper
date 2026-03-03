

# Corriger les signatures du Président et de la Trésorière

## Problème

Les `useEffect` d'auto-upload dans `Parametres.tsx` vérifient `if (!settings.president_signature_url)` — mais une ancienne URL existe déjà en base. Donc les nouvelles images locales (`public/signatures/president_sign.png` et `public/signatures/tresoriere_sign.png`) ne sont jamais uploadées.

## Solution

Forcer le re-upload des signatures depuis les assets locaux corrects. Deux actions :

### 1. Uploader manuellement les images correctes vers le storage et mettre à jour la base

Utiliser le code existant `uploadFile` pour :
- Fetch `public/signatures/president_sign.png` (l'image Idriss_sign.png copiée précédemment)
- Fetch `public/signatures/tresoriere_sign.png` (l'image Gemini copiée précédemment)
- Uploader chacune vers `kpt-files/signatures/`
- Mettre à jour `settings_association` avec les nouvelles URLs

### 2. Modifier le useEffect pour détecter un changement d'asset

Remplacer la condition `!settings.president_signature_url` par une vérification plus intelligente : comparer l'URL actuelle à un marqueur connu, ou simplement forcer un re-upload unique.

**Approche retenue** : Ajouter un flag de version dans le nom de fichier local pour forcer le re-upload. Concrètement :
- Renommer la logique pour uploader vers un chemin fixe (`signatures/president_official.png` et `signatures/tresoriere_official.png`)
- Vérifier si l'URL actuelle contient `president_official` — si non, re-uploader

### Fichier modifié
- `src/pages/Parametres.tsx` : modifier les deux `useEffect` d'auto-upload pour forcer le remplacement des anciennes signatures par les assets locaux corrects

