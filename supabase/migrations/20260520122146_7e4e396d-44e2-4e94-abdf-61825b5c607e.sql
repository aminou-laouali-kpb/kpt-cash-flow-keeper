CREATE TABLE public.budget_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at timestamptz,
  allow_export boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  revoked_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  label text
);

CREATE INDEX idx_budget_share_links_budget ON public.budget_share_links(budget_id);
CREATE INDEX idx_budget_share_links_token ON public.budget_share_links(token);

ALTER TABLE public.budget_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view share links"
  ON public.budget_share_links FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/comptable can manage share links"
  ON public.budget_share_links FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role));