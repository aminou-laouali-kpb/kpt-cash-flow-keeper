CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND cmd='SELECT' AND qual='true'
      AND tablename IN ('audit_logs','budget_categories','budget_insights','budget_lines','budget_share_links','budgets','categorization_rules','payment_budget_allocations','payment_documents','payment_signatures','payment_versions','payments','projects','signature_requests')
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I USING (public.is_team_member(auth.uid()))', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER POLICY "Authenticated can insert budget_insights" ON public.budget_insights WITH CHECK (public.is_team_member(auth.uid()));
ALTER POLICY "Authenticated can insert categorization_rules" ON public.categorization_rules WITH CHECK (public.is_team_member(auth.uid()) AND (created_by IS NULL OR created_by = auth.uid()));
ALTER POLICY "Authenticated can insert payment_budget_allocations" ON public.payment_budget_allocations WITH CHECK (public.is_team_member(auth.uid()));
ALTER POLICY "Authenticated can view KPT files" ON storage.objects USING (bucket_id = 'kpt-files' AND public.is_team_member(auth.uid()));