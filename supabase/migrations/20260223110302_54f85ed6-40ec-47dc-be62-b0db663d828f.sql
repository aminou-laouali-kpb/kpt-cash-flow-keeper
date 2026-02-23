
-- Tighten signature_requests UPDATE policy to require valid token
DROP POLICY IF EXISTS "Public can update signature_requests" ON public.signature_requests;

CREATE POLICY "Public can update signature_requests by token"
  ON public.signature_requests FOR UPDATE
  TO anon
  USING (
    status = 'pending' AND expires_at > now()
  )
  WITH CHECK (
    status IN ('signed', 'refused')
  );
