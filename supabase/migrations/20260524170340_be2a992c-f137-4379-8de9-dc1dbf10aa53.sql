-- 1. Lock down audit_logs INSERT to admins only
DROP POLICY IF EXISTS "System can insert audit_logs" ON public.audit_logs;

CREATE POLICY "Admins can insert audit_logs"
  ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Secure token-based signature flow via SECURITY DEFINER RPCs
-- Drop overly permissive anon policies
DROP POLICY IF EXISTS "Public can view signature_requests by token" ON public.signature_requests;
DROP POLICY IF EXISTS "Public can update signature_requests by token" ON public.signature_requests;
DROP POLICY IF EXISTS "Anon can view payments via token" ON public.payments;
DROP POLICY IF EXISTS "Anon can view projects via token" ON public.projects;
DROP POLICY IF EXISTS "Public can insert signatures via token" ON public.payment_signatures;

-- RPC: fetch a signature request + minimal payment context by exact token
CREATE OR REPLACE FUNCTION public.get_signature_request_by_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', sr.id,
    'payment_id', sr.payment_id,
    'status', sr.status,
    'expires_at', sr.expires_at,
    'signed_at', sr.signed_at,
    'refusal_reason', sr.refusal_reason,
    'payments', jsonb_build_object(
      'reference', p.reference,
      'montant', p.montant,
      'devise', p.devise,
      'date_paiement', p.date_paiement,
      'beneficiaire_nom', p.beneficiaire_nom,
      'motif', p.motif,
      'projects', CASE WHEN pr.id IS NULL THEN NULL ELSE jsonb_build_object('nom', pr.nom) END
    )
  )
  INTO _row
  FROM public.signature_requests sr
  JOIN public.payments p ON p.id = sr.payment_id
  LEFT JOIN public.projects pr ON pr.id = p.project_id
  WHERE sr.token = _token;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.get_signature_request_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signature_request_by_token(uuid) TO anon, authenticated;

-- RPC: sign via token (creates signature + marks request signed)
CREATE OR REPLACE FUNCTION public.sign_payment_via_token(
  _token uuid,
  _signer_name text,
  _signature_image_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req public.signature_requests%ROWTYPE;
BEGIN
  SELECT * INTO _req FROM public.signature_requests
  WHERE token = _token AND status = 'pending' AND expires_at > now()
  FOR UPDATE;

  IF _req.id IS NULL THEN
    RAISE EXCEPTION 'Lien de signature invalide ou expiré';
  END IF;

  INSERT INTO public.payment_signatures (payment_id, signer_type, signer_name, signature_image_url, signed_at, is_valid)
  VALUES (_req.payment_id, 'beneficiaire', _signer_name, _signature_image_url, now(), true);

  UPDATE public.signature_requests
  SET status = 'signed', signed_at = now()
  WHERE id = _req.id;
END;
$$;

REVOKE ALL ON FUNCTION public.sign_payment_via_token(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sign_payment_via_token(uuid, text, text) TO anon, authenticated;

-- RPC: refuse via token
CREATE OR REPLACE FUNCTION public.refuse_signature_via_token(
  _token uuid,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req_id uuid;
BEGIN
  UPDATE public.signature_requests
  SET status = 'refused', refusal_reason = _reason
  WHERE token = _token AND status = 'pending' AND expires_at > now()
  RETURNING id INTO _req_id;

  IF _req_id IS NULL THEN
    RAISE EXCEPTION 'Lien de signature invalide ou expiré';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.refuse_signature_via_token(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refuse_signature_via_token(uuid, text) TO anon, authenticated;