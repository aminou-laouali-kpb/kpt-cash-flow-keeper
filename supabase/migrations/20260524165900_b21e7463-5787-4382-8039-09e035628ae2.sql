-- Allow all authenticated users to use AI features by opening INSERT
-- on AI-related tables. UPDATE/DELETE remain restricted to admin/comptable.

-- payment_budget_allocations: replace ALL policy with split policies
DROP POLICY IF EXISTS "Admin/comptable can manage payment_budget_allocations" ON public.payment_budget_allocations;

CREATE POLICY "Authenticated can insert payment_budget_allocations"
  ON public.payment_budget_allocations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/comptable can update payment_budget_allocations"
  ON public.payment_budget_allocations
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role));

CREATE POLICY "Admin/comptable can delete payment_budget_allocations"
  ON public.payment_budget_allocations
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role));

-- budget_insights: open INSERT to all authenticated
DROP POLICY IF EXISTS "Admin/comptable can manage budget_insights" ON public.budget_insights;

CREATE POLICY "Authenticated can insert budget_insights"
  ON public.budget_insights
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/comptable can update budget_insights"
  ON public.budget_insights
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role));

CREATE POLICY "Admin/comptable can delete budget_insights"
  ON public.budget_insights
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role));

-- categorization_rules: open INSERT (learning) to all authenticated
DROP POLICY IF EXISTS "Admin/comptable can manage categorization_rules" ON public.categorization_rules;

CREATE POLICY "Authenticated can insert categorization_rules"
  ON public.categorization_rules
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/comptable can update categorization_rules"
  ON public.categorization_rules
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role));

CREATE POLICY "Admin/comptable can delete categorization_rules"
  ON public.categorization_rules
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role));