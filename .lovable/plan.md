

# Correction du bug de creation de paiement et ajout des signatures

## Bug identifie

La fonction SQL `generate_payment_reference()` echoue avec l'erreur "UPDATE requires a WHERE clause". La ligne 163 de la migration fait un UPDATE sans WHERE :
```sql
UPDATE public.settings_association SET prochain_numero = _numero + 1;
```
Il faut ajouter une clause WHERE pour cibler l'enregistrement singleton.

## Corrections et ajouts prevus

### 1. Correction de la fonction SQL `generate_payment_reference()`

Creer une migration qui remplace la fonction avec un WHERE clause :
```sql
UPDATE public.settings_association 
SET prochain_numero = _numero + 1 
WHERE id = (SELECT id FROM public.settings_association LIMIT 1);
```

### 2. Installation de react-signature-canvas

Ajouter la dependance `react-signature-canvas` et ses types `@types/react-signature-canvas` au projet.

### 3. Composants de signature a creer

- **`src/components/SignatureCanvas.tsx`** : composant wrapper autour de react-signature-canvas avec boutons Effacer/Valider, compatible mobile (tactile)
- **`src/components/SignatureDialog.tsx`** : dialogue modal pour la signature sur place du beneficiaire, avec le canvas integre
- **`src/components/SendSignatureLink.tsx`** : dialogue pour generer et envoyer le lien de signature a distance (copier, WhatsApp, email)
- **`src/pages/SignaturePage.tsx`** : page publique accessible via token (resume fiche + zone signature + boutons Je signe / Je refuse)

### 4. Integration dans PaiementDetail

Ajouter dans la page detail du paiement :
- Bloc signatures avec affichage des signatures President et Tresoriere (auto depuis les parametres)
- Zone signature beneficiaire avec statut (en attente / signee)
- Boutons "Signer sur place" et "Envoyer lien de signature"

### 5. Route publique

Ajouter la route `/signer/:token` dans App.tsx, hors du ProtectedRoute, pour permettre la signature a distance sans authentification.

### 6. Hook useSignatures

Creer `src/hooks/useSignatures.ts` pour gerer les operations CRUD sur payment_signatures et signature_requests.

## Fichiers modifies

- Migration SQL (nouvelle) : correction `generate_payment_reference()`
- `package.json` : ajout react-signature-canvas
- `src/components/SignatureCanvas.tsx` (nouveau)
- `src/components/SignatureDialog.tsx` (nouveau)
- `src/components/SendSignatureLink.tsx` (nouveau)
- `src/hooks/useSignatures.ts` (nouveau)
- `src/pages/SignaturePage.tsx` (nouveau)
- `src/pages/PaiementDetail.tsx` : ajout section signatures + boutons
- `src/App.tsx` : ajout route `/signer/:token`

