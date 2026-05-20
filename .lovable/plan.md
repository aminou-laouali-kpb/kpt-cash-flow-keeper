# Export, partage et insights IA pour les budgets

## 1. Téléchargement du budget complet (PDF + Excel)

Bouton **"Télécharger"** sur la page `BudgetDetail` avec deux formats au choix :

### PDF (à partager avec le bailleur)
- En-tête : logo KPT, nom du programme, période, devise, taux de change, statut
- Tableau récapitulatif (Prévu / Consommé / Restant / % exécution) par rubrique et par ligne
- Code couleur : vert (<70%), orange (70–90%), rouge (>90% ou dépassement)
- Section par rubrique listant **toutes les dépenses imputées** (date, bénéficiaire, motif, montant, source IA/règle/manuel, statut signature)
- Section "Dépenses non imputées" pour transparence
- Pied de page : généré le … par … · signature institutionnelle KPT

### Excel (.xlsx)
- Feuille 1 — *Synthèse* : rubriques + lignes avec consommation
- Feuille 2 — *Dépenses* : toutes les dépenses imputées, une ligne = une allocation, colonnes triables/filtrables
- Feuille 3 — *Non imputé* : dépenses du programme sans allocation
- Formules SUM par rubrique pour rester dynamique

## 2. Lien de partage dynamique (vue bailleur)

- Bouton **"Partager"** → ouvre un dialog qui génère un **lien public en lecture seule** avec token
- Le lien donne accès à une nouvelle page `/public/budget/:token` qui affiche la même vue synthèse que le PDF, mais **en temps réel** (mise à jour à chaque nouvelle dépense imputée)
- Options à la création : durée de validité (7j / 30j / illimité), possibilité de révoquer, possibilité d'autoriser le téléchargement PDF/Excel depuis la page publique
- La page publique n'expose **que** : structure budgétaire, montants, dépenses imputées avec motif/bénéficiaire/montant. **Pas** d'accès aux pièces jointes ni aux signatures internes.
- Liste des liens actifs visible dans `BudgetDetail` avec date de création, expiration, nombre de vues, bouton "Révoquer"

## 3. Insights IA sur le budget

Section **"Conseils de l'IA"** dans `BudgetDetail`, déclenchée par un bouton **"Analyser le budget"** (re-générable).

L'IA (`google/gemini-2.5-pro` pour qualité, fallback `gemini-3-flash-preview`) reçoit :
- structure des rubriques + lignes + montants prévus
- consommation actuelle par ligne
- liste des dépenses imputées récentes
- temps restant avant fin du projet

Et produit trois blocs :

### a) Alertes de dépassement & rééquilibrages
Pour chaque ligne dépassée (>100%), proposer 1–3 lignes "donneuses" plausibles (sous-consommées, même rubrique de préférence) avec montant suggéré à transférer. Bouton **"Préparer le réajustement"** qui crée une note interne (pas de modif auto du budget).

### b) Recommandations de dépenses
Pour les lignes sous-consommées avec peu de temps restant, suggérer **types de dépenses concrètes** alignées avec le libellé/justification de la ligne et le contexte du programme (ex : "Ligne *Formation des formateurs* sous-utilisée à 30% — organiser un module additionnel à Niamey, ~X XOF").

### c) Synthèse exécutive
2–3 paragraphes : santé globale du budget, risques, priorités des 30 prochains jours.

Les insights sont **stockés** dans la table `budget_insights` (déjà existante) → cache + historique. Re-génération possible à tout moment.

## Détails techniques

**Nouvelle table** : `budget_share_links` (`id`, `budget_id`, `token`, `expires_at`, `allow_export bool`, `view_count`, `created_by`, `revoked_at`).
RLS : admin/comptable manage ; anon SELECT via token (similaire à `signature_requests`).

**Nouvelles RLS anon** sur `budgets`, `budget_categories`, `budget_lines`, `payments`, `payment_budget_allocations` : SELECT autorisé si le budget est référencé par un `budget_share_links` actif (token vérifié côté client par edge function).

**Edge functions** :
- `export-budget` : génère PDF (jsPDF + autoTable) ou XLSX (xlsx package), retourne base64
- `budget-insights` : appelle l'IA avec le contexte, valide la réponse via JSON schema, écrit dans `budget_insights`
- `public-budget-view` : prend un token, retourne la vue agrégée (contourne les RLS via service role + vérif token)

**Frontend** :
- `BudgetDetail.tsx` : 2 nouveaux boutons (Télécharger ▾, Partager), 1 carte "Conseils IA"
- `src/pages/PublicBudget.tsx` (nouvelle route `/public/budget/:token`, hors AppLayout)
- `src/hooks/useBudgetShares.ts`, `useBudgetInsights.ts`, `useBudgetExport.ts`

**Pas de changement** sur l'imputation existante.

## Hors scope (à confirmer)

- Modification automatique des montants prévus par l'IA → **non** : l'IA propose, l'humain valide manuellement (sécurité comptable)
- Notifications email au bailleur quand le budget est mis à jour → à voir plus tard
- Multi-bailleurs avec vues filtrées par sous-budget → à voir plus tard
