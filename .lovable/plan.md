

# Suppression de l'inscription publique et invitation par les admins

## Changements prevus

### 1. Simplifier la page de connexion (`src/pages/Login.tsx`)

- Supprimer l'etat `isSignUp`, `fullName` et toute la logique d'inscription
- Supprimer le bloc conditionnel "Nom complet"
- Supprimer le bouton "Creer un compte" en bas
- Garder uniquement le formulaire email + mot de passe + bouton "Se connecter"

### 2. Ajouter une section "Inviter un utilisateur" dans la page Parametres (`src/pages/Parametres.tsx`)

- Ajouter une nouvelle Card "Gestion des utilisateurs" apres les cartes existantes
- Contient un champ email + un bouton "Envoyer l'invitation"
- Utilise `supabase.auth.admin.inviteUserByEmail()` via une edge function (le client frontend n'a pas les droits admin)
- Visible uniquement pour les admins (idriss@karatoupourtous.org et aminou@karatoupourtous.org)

### 3. Creer une edge function `invite-user` (`supabase/functions/invite-user/index.ts`)

- Recoit un email en POST
- Verifie que l'appelant est authentifie et est admin (via la table `user_roles`)
- Utilise le service role key pour appeler `supabase.auth.admin.inviteUserByEmail(email)`
- L'utilisateur invite recevra un email avec un lien pour definir son mot de passe

### 4. Ajouter une route pour definir le mot de passe (`src/pages/SetPassword.tsx`)

- Page accessible via le lien d'invitation (type `invite` dans le hash URL)
- Formulaire pour definir un mot de passe
- Appelle `supabase.auth.updateUser({ password })` puis redirige vers le dashboard
- Route ajoutee dans `App.tsx` : `/set-password`

## Details techniques

**Edge function `invite-user` :**
- Verifie le JWT de l'appelant
- Interroge `user_roles` pour confirmer le role `admin`
- Appelle `createClient` avec le service role key et `auth.admin.inviteUserByEmail(email, { redirectTo: origin + '/set-password' })`

**Page Login simplifiee :**
- Plus aucune reference a `signUp` — uniquement `signInWithPassword`

**Page SetPassword :**
- Detecte le token d'invitation dans l'URL (gere automatiquement par le systeme d'auth)
- Affiche un formulaire mot de passe + confirmation
- Met a jour le mot de passe via `updateUser`

## Fichiers modifies ou crees

- `src/pages/Login.tsx` : simplification (suppression inscription)
- `src/pages/Parametres.tsx` : ajout section invitation utilisateur
- `supabase/functions/invite-user/index.ts` : nouvelle edge function
- `src/pages/SetPassword.tsx` : nouvelle page pour definir le mot de passe
- `src/App.tsx` : ajout route `/set-password`

