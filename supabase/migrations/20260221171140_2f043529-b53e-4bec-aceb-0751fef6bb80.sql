
-- Phase 3: Projects table
CREATE TYPE public.project_status AS ENUM ('actif', 'cloture');

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  code text NOT NULL,
  description text,
  date_debut date,
  date_fin date,
  responsable text,
  budget_previsionnel numeric(15,2) DEFAULT 0,
  statut project_status NOT NULL DEFAULT 'actif',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS: all authenticated can read
CREATE POLICY "Authenticated can view projects"
  ON public.projects FOR SELECT TO authenticated
  USING (true);

-- RLS: admin/comptable can insert
CREATE POLICY "Admin/comptable can insert projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'comptable'));

-- RLS: admin/comptable can update
CREATE POLICY "Admin/comptable can update projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'comptable'));

-- RLS: admin can delete
CREATE POLICY "Admin can delete projects"
  ON public.projects FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Default project
INSERT INTO public.projects (nom, code, description, statut)
VALUES ('Fonctionnement général', 'FONC-GEN', 'Dépenses générales de fonctionnement de l''association', 'actif');

-- Phase 5: Payments enums and tables
CREATE TYPE public.payment_status AS ENUM ('brouillon', 'en_attente_signature', 'signe', 'a_re_signer');
CREATE TYPE public.payment_type AS ENUM ('recu_importe', 'fiche_manuelle');
CREATE TYPE public.expense_category AS ENUM (
  'fournitures', 'transport', 'restauration', 'hebergement', 'communication',
  'equipement_sportif', 'location_salle', 'honoraires', 'frais_bancaires',
  'assurance', 'formation', 'evenement', 'autre'
);
CREATE TYPE public.payment_mode AS ENUM (
  'especes', 'virement', 'cheque', 'mobile_money', 'carte_bancaire', 'autre'
);
CREATE TYPE public.document_type AS ENUM ('facture', 'recu', 'autre');

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  type payment_type NOT NULL DEFAULT 'fiche_manuelle',
  project_id uuid REFERENCES public.projects(id),
  date_paiement date NOT NULL DEFAULT CURRENT_DATE,
  montant numeric(15,2) NOT NULL,
  devise text NOT NULL DEFAULT 'XOF',
  categorie expense_category NOT NULL DEFAULT 'autre',
  mode_paiement payment_mode NOT NULL DEFAULT 'especes',
  beneficiaire_nom text NOT NULL,
  beneficiaire_telephone text,
  beneficiaire_email text,
  beneficiaire_adresse text,
  beneficiaire_piece_type text,
  beneficiaire_piece_numero text,
  motif text NOT NULL,
  lieu text,
  reference_transaction text,
  commentaire text,
  personne_effectuant text,
  motif_absence_recu text,
  autorisation_reference text,
  statut payment_status NOT NULL DEFAULT 'brouillon',
  version_courante integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view payments"
  ON public.payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/comptable can insert payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'comptable'));

CREATE POLICY "Admin/comptable can update payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'comptable'));

CREATE POLICY "Admin can delete payments"
  ON public.payments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment documents
CREATE TABLE public.payment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  type_piece document_type NOT NULL DEFAULT 'autre',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view payment_documents"
  ON public.payment_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/comptable can insert payment_documents"
  ON public.payment_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'comptable'));

CREATE POLICY "Admin/comptable can delete payment_documents"
  ON public.payment_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'comptable'));

-- Generate payment reference function
CREATE OR REPLACE FUNCTION public.generate_payment_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  UPDATE public.settings_association SET prochain_numero = _numero + 1;

  RETURN _ref;
END;
$$;

-- Phase 7: Signatures tables
CREATE TYPE public.signer_type AS ENUM ('president', 'tresoriere', 'beneficiaire');
CREATE TYPE public.signature_request_status AS ENUM ('pending', 'signed', 'refused', 'expired');

CREATE TABLE public.payment_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE NOT NULL,
  signer_type signer_type NOT NULL,
  signer_name text,
  signature_image_url text,
  signed_at timestamptz,
  ip_address text,
  is_valid boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view payment_signatures"
  ON public.payment_signatures FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/comptable can manage payment_signatures"
  ON public.payment_signatures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'comptable'));

-- Allow anonymous access for signature via token (public signing page)
CREATE POLICY "Public can insert signatures via token"
  ON public.payment_signatures FOR INSERT TO anon
  WITH CHECK (true);

CREATE TABLE public.signature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status signature_request_status NOT NULL DEFAULT 'pending',
  sent_via text,
  refusal_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  signed_at timestamptz
);

ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view signature_requests"
  ON public.signature_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/comptable can manage signature_requests"
  ON public.signature_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'comptable'));

-- Public access for signing page (by token)
CREATE POLICY "Public can view signature_requests by token"
  ON public.signature_requests FOR SELECT TO anon USING (true);

CREATE POLICY "Public can update signature_requests"
  ON public.signature_requests FOR UPDATE TO anon USING (true);

-- Phase 8: Versioning and audit
CREATE TABLE public.payment_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE NOT NULL,
  version_number integer NOT NULL,
  data jsonb NOT NULL,
  modified_by uuid REFERENCES auth.users(id),
  modified_at timestamptz NOT NULL DEFAULT now(),
  modification_reason text,
  fields_changed text[],
  signature_invalidated boolean NOT NULL DEFAULT false
);

ALTER TABLE public.payment_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view payment_versions"
  ON public.payment_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/comptable can insert payment_versions"
  ON public.payment_versions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'comptable'));

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Trigger to auto-create version on payment update
CREATE OR REPLACE FUNCTION public.create_payment_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.payment_versions (payment_id, version_number, data, modified_by)
  VALUES (OLD.id, OLD.version_courante, to_jsonb(OLD), auth.uid());
  
  NEW.version_courante := OLD.version_courante + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_version_on_payment_update
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.create_payment_version();
