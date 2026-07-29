## Diagnostic (vérifié en base)

Le message « new row violates row-level security policy for table "payments" » n'est pas un bug de code : la règle d'insertion des paiements exige que l'utilisateur ait le rôle **admin** ou **comptable**.

Or la table des rôles ne contient **qu'une seule ligne** : aminou@karatoupourtous.org (admin). Les 4 autres comptes existants n'ont aucun rôle :

- idriss@karatoupourtous.org
- laouali@karatoupourtous.org
- chamsia@karatoupourtous.org
- idrisslaouali@gmail.com

Cause racine : le rôle admin n'est attribué automatiquement qu'au tout premier utilisateur inscrit ; les comptes créés ensuite n'obtiennent aucun rôle et sont donc en lecture seule de fait.

## Correction

1. Ajouter les rôles manquants :
   - idriss@karatoupourtous.org → **admin**
   - laouali@, chamsia@, idrisslaouali@gmail.com → **comptable**
2. Vérifier après coup que chaque compte a bien un rôle.

## Amélioration pour éviter que ça se reproduise

Attribuer par défaut le rôle **comptable** à tout nouveau compte créé (au lieu d'aucun rôle), l'admin pouvant ensuite ajuster. Les inscriptions publiques restant fermées, seuls les comptes invités par un admin sont concernés — donc pas de risque d'ouverture non désirée.

## Détails techniques

- Insertion de lignes dans `public.user_roles` (pas de changement de schéma pour l'étape 1).
- Étape 3 : trigger existant `handle_first_user_admin` étendu — si la table des rôles n'est pas vide, insérer `comptable` pour le nouveau profil (avec `ON CONFLICT DO NOTHING`).
