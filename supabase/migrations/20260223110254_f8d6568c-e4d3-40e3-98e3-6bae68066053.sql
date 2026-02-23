
-- Fix RLS policies: convert RESTRICTIVE to PERMISSIVE for public signature access

-- signature_requests: drop restrictive, recreate permissive
DROP POLICY IF EXISTS "Public can view signature_requests by token" ON public.signature_requests;
DROP POLICY IF EXISTS "Public can update signature_requests" ON public.signature_requests;

CREATE POLICY "Public can view signature_requests by token"
  ON public.signature_requests FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can update signature_requests"
  ON public.signature_requests FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- payments: allow anon SELECT when linked to a signature_request
CREATE POLICY "Anon can view payments via token"
  ON public.payments FOR SELECT
  TO anon
  USING (
    id IN (SELECT payment_id FROM public.signature_requests)
  );

-- projects: allow anon SELECT when linked via payment -> signature_request
CREATE POLICY "Anon can view projects via token"
  ON public.projects FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT p.project_id FROM public.payments p
      WHERE p.id IN (SELECT payment_id FROM public.signature_requests)
      AND p.project_id IS NOT NULL
    )
  );

-- payment_signatures: drop restrictive, recreate permissive for insert
DROP POLICY IF EXISTS "Public can insert signatures via token" ON public.payment_signatures;

CREATE POLICY "Public can insert signatures via token"
  ON public.payment_signatures FOR INSERT
  TO anon
  WITH CHECK (
    payment_id IN (
      SELECT payment_id FROM public.signature_requests
      WHERE status = 'pending' AND expires_at > now()
    )
  );
