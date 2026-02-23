
-- Function to auto-update payment status on signature insert
CREATE OR REPLACE FUNCTION public.update_payment_status_on_signature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_valid = true THEN
    UPDATE public.payments SET statut = 'signe' WHERE id = NEW.payment_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on payment_signatures
CREATE TRIGGER on_signature_inserted
AFTER INSERT ON public.payment_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_payment_status_on_signature();

-- Fix existing stuck payments
UPDATE public.payments
SET statut = 'signe'
WHERE statut = 'en_attente_signature'
  AND id IN (
    SELECT payment_id FROM public.payment_signatures WHERE is_valid = true
  );
