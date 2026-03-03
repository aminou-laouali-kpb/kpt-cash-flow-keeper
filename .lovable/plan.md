

# Enregistrer la signature du Président

## Ce qui sera fait

1. **Copier l'image** `user-uploads://Idriss_sign.png` dans `src/assets/signatures/president_sign.png`
2. **Uploader automatiquement** cette image dans le storage (`kpt-files/signatures/`) au demarrage de l'application, puis mettre a jour le champ `president_signature_url` dans la table `settings_association`
3. Concretement : creer un petit script d'initialisation (ou un one-shot dans la page Parametres) qui detecte si la signature du president n'est pas encore configuree et l'uploade depuis l'asset local

### Approche simplifiee

Plutot qu'un mecanisme complexe, le plus direct :

1. Copier le fichier dans `public/signatures/president_sign.png`
2. Dans `src/pages/Parametres.tsx`, ajouter un `useEffect` one-shot qui, au chargement, uploade cette image vers le storage et sauvegarde l'URL dans les settings — uniquement si `president_signature_url` est vide/null
3. Une fois uploadee, la signature apparaitra dans les Parametres et dans tous les PDF generes, avec le meme rendu proportionnel que les autres signatures

### Fichiers modifies
- Copie de `user-uploads://Idriss_sign.png` → `public/signatures/president_sign.png`
- `src/pages/Parametres.tsx` : ajout d'un useEffect d'auto-upload initial

L'image est carree (1:1), ce qui est coherent avec le systeme de rendu proportionnel deja en place — elle sera correctement mise a l'echelle dans le PDF.

En attente de la signature de la tresoriere pour la prochaine etape.

