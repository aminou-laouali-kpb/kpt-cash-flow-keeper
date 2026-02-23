

# Correction : mise a jour automatique du statut apres signature

## Probleme

Quand un beneficiaire signe via le lien public, il n'est pas connecte. Les regles de securite de la base de donnees empechent les utilisateurs anonymes de modifier la table `payments`. Resultat : la signature est bien enregistree, mais le statut du paiement reste bloque sur "en_attente_signature".

## Solution

Creer un **trigger automatique** sur la table `payment_signatures` : a chaque nouvelle signature valide inseree, le trigger met automatiquement a jour le statut du paiement correspondant vers "signe". Cela fonctionne car les triggers s'executent avec les privileges du proprietaire de la fonction (SECURITY DEFINER), contournant les restrictions de securite.

## Modifications

### 1. Migration SQL (nouveau fichier)

Creer une fonction `update_payment_status_on_signature()` et un trigger `on_signature_inserted` :

- La fonction verifie que la signature inseree est valide (`is_valid = true`)
- Si oui, elle met a jour le statut du paiement vers `signe`
- Le trigger se declenche AFTER INSERT sur `payment_signatures`
- La fonction est SECURITY DEFINER pour avoir les droits necessaires

### 2. Nettoyage du code client (`src/hooks/useSignatures.ts`)

Supprimer les appels manuels de mise a jour du statut dans `signViaToken` et `createSignature`, puisque le trigger s'en charge automatiquement. Cela evite les doublons et les echecs silencieux.

### 3. Correction immediate de la fiche existante

La migration inclura aussi une requete pour corriger les paiements actuellement bloques : tout paiement ayant une signature valide mais encore en statut "en_attente_signature" sera passe a "signe".

## Details techniques

```text
Flux apres correction :

  Beneficiaire signe
       |
       v
  INSERT payment_signatures (is_valid=true)
       |
       v
  TRIGGER on_signature_inserted
       |
       v
  UPDATE payments SET statut='signe'
  (execute en SECURITY DEFINER, pas de probleme RLS)
```

## Fichiers concernes

- Nouvelle migration SQL : trigger + correction des fiches existantes
- `src/hooks/useSignatures.ts` : suppression des mises a jour manuelles du statut (devenues redondantes)

