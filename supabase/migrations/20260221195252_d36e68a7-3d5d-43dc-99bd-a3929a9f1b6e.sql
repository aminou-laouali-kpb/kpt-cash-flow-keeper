CREATE OR REPLACE FUNCTION public.generate_payment_reference()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _prefixe text;
  _numero integer;
  _annee text;
  _ref text;
BEGIN
  SELECT prefixe_numerotation, prochain_numero INTO _prefixe, _numero
  FROM public.settings_association LIMIT 1;

  IF _prefixe IS NULL THEN
    _prefixe := 'KPT-PAY';
    _numero := 1;
  END IF;

  _annee := to_char(now(), 'YYYY');
  _ref := _prefixe || '-' || _annee || '-' || lpad(_numero::text, 4, '0');

  UPDATE public.settings_association 
  SET prochain_numero = _numero + 1 
  WHERE id = (SELECT id FROM public.settings_association LIMIT 1);

  RETURN _ref;
END;
$function$;