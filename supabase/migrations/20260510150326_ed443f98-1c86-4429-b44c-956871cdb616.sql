
-- 1. Hiérarchie projets
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ville text,
  ADD COLUMN IF NOT EXISTS type_projet text NOT NULL DEFAULT 'standard' CHECK (type_projet IN ('programme','site','standard'));

CREATE INDEX IF NOT EXISTS idx_projects_parent ON public.projects(parent_id);

-- 2. Budgets
CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  nom text NOT NULL,
  devise text NOT NULL DEFAULT 'USD',
  taux_change_xof numeric NOT NULL DEFAULT 600,
  montant_total numeric NOT NULL DEFAULT 0,
  montant_cost_share numeric NOT NULL DEFAULT 0,
  source_file_url text,
  source_file_name text,
  source_raw jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  imported_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_budgets_project ON public.budgets(project_id);
CREATE INDEX idx_budgets_status ON public.budgets(status);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view budgets" ON public.budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/comptable can insert budgets" ON public.budgets FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'));
CREATE POLICY "Admin/comptable can update budgets" ON public.budgets FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'));
CREATE POLICY "Admin can delete budgets" ON public.budgets FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_budgets_updated_at BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Catégories budgétaires (arbre)
CREATE TABLE public.budget_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  code text,
  libelle text NOT NULL,
  niveau text NOT NULL DEFAULT 'rubrique' CHECK (niveau IN ('rubrique','sous_categorie')),
  montant_prevu numeric NOT NULL DEFAULT 0,
  ordre int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_budget_categories_budget ON public.budget_categories(budget_id);
CREATE INDEX idx_budget_categories_parent ON public.budget_categories(parent_id);

ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view budget_categories" ON public.budget_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/comptable can manage budget_categories" ON public.budget_categories FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'));

-- 4. Lignes budgétaires
CREATE TABLE public.budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  libelle text NOT NULL,
  description text,
  cost_unitaire numeric,
  quantite numeric,
  montant_prevu numeric NOT NULL DEFAULT 0,
  cost_share numeric NOT NULL DEFAULT 0,
  villes text[] DEFAULT '{}',
  justification text,
  source_row int,
  ordre int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_budget_lines_budget ON public.budget_lines(budget_id);
CREATE INDEX idx_budget_lines_category ON public.budget_lines(category_id);

ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view budget_lines" ON public.budget_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/comptable can manage budget_lines" ON public.budget_lines FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'));

-- 5. Allocations paiements ↔ lignes
CREATE TABLE public.payment_budget_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  budget_line_id uuid NOT NULL REFERENCES public.budget_lines(id) ON DELETE CASCADE,
  montant_alloue numeric NOT NULL,
  montant_alloue_devise_budget numeric,
  confidence numeric DEFAULT 1.0,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('ia_auto','manual','rule')),
  reasoning text,
  validated_by uuid,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pba_payment ON public.payment_budget_allocations(payment_id);
CREATE INDEX idx_pba_budget_line ON public.payment_budget_allocations(budget_line_id);

ALTER TABLE public.payment_budget_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view payment_budget_allocations" ON public.payment_budget_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/comptable can manage payment_budget_allocations" ON public.payment_budget_allocations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'));

-- 6. Règles d'apprentissage
CREATE TABLE public.categorization_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL,
  budget_line_id uuid NOT NULL REFERENCES public.budget_lines(id) ON DELETE CASCADE,
  match_count int NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_categorization_rules_pattern ON public.categorization_rules(pattern);

ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view categorization_rules" ON public.categorization_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/comptable can manage categorization_rules" ON public.categorization_rules FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'));

-- 7. Cache insights IA
CREATE TABLE public.budget_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  insights jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_budget_insights_budget ON public.budget_insights(budget_id);

ALTER TABLE public.budget_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view budget_insights" ON public.budget_insights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/comptable can manage budget_insights" ON public.budget_insights FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'));

-- 8. Vues
CREATE OR REPLACE VIEW public.v_budget_line_consumption AS
SELECT
  bl.id AS budget_line_id,
  bl.budget_id,
  bl.category_id,
  bl.libelle,
  bl.montant_prevu,
  COALESCE(SUM(pba.montant_alloue_devise_budget), 0) AS montant_consomme,
  bl.montant_prevu - COALESCE(SUM(pba.montant_alloue_devise_budget), 0) AS montant_restant,
  CASE WHEN bl.montant_prevu > 0
    THEN (COALESCE(SUM(pba.montant_alloue_devise_budget), 0) / bl.montant_prevu) * 100
    ELSE 0 END AS pct_consomme
FROM public.budget_lines bl
LEFT JOIN public.payment_budget_allocations pba ON pba.budget_line_id = bl.id
GROUP BY bl.id;

CREATE OR REPLACE VIEW public.v_budget_summary AS
SELECT
  b.id AS budget_id,
  b.project_id,
  b.montant_total,
  COALESCE(SUM(pba.montant_alloue_devise_budget), 0) AS montant_consomme,
  b.montant_total - COALESCE(SUM(pba.montant_alloue_devise_budget), 0) AS montant_restant,
  CASE WHEN b.montant_total > 0
    THEN (COALESCE(SUM(pba.montant_alloue_devise_budget), 0) / b.montant_total) * 100
    ELSE 0 END AS pct_consomme
FROM public.budgets b
LEFT JOIN public.budget_lines bl ON bl.budget_id = b.id
LEFT JOIN public.payment_budget_allocations pba ON pba.budget_line_id = bl.id
GROUP BY b.id;
