
-- 1. Rendre le bucket kpt-files privé
UPDATE storage.buckets SET public = false WHERE id = 'kpt-files';

-- 2. Remplacer les politiques storage.objects pour kpt-files
DROP POLICY IF EXISTS "Anyone can view KPT files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload KPT files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete KPT files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update KPT files" ON storage.objects;

CREATE POLICY "Authenticated can view KPT files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'kpt-files');

CREATE POLICY "Admin/comptable can upload KPT files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kpt-files'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'comptable'::public.app_role))
);

CREATE POLICY "Admin/comptable can update KPT files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kpt-files'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'comptable'::public.app_role))
);

CREATE POLICY "Admin/comptable can delete KPT files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'kpt-files'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'comptable'::public.app_role))
);

-- 3. Restreindre la lecture de settings_association à admin/comptable
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings_association;

CREATE POLICY "Admin/comptable can view settings"
ON public.settings_association FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'comptable'::public.app_role)
);

-- 4. Fonction publique pour récupérer uniquement les champs non sensibles d'en-tête PDF
CREATE OR REPLACE FUNCTION public.get_settings_public_header()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'nom', nom,
    'logo_url', logo_url,
    'adresse', adresse,
    'telephone', telephone,
    'email', email,
    'mention_legale', mention_legale,
    'devise_defaut', devise_defaut,
    'prefixe_numerotation', prefixe_numerotation
  )
  INTO _row
  FROM public.settings_association
  LIMIT 1;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_settings_public_header() TO authenticated;
