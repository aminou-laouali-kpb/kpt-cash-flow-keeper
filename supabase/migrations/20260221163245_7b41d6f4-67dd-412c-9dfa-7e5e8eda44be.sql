
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'comptable', 'lecture_seule');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: users can see their own roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
-- Admins can manage all roles
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create settings_association table (singleton)
CREATE TABLE public.settings_association (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL DEFAULT 'Karaté Pour Tous (KPT)',
  logo_url TEXT,
  adresse TEXT,
  telephone TEXT,
  email TEXT,
  president_nom TEXT,
  president_fonction TEXT DEFAULT 'Président',
  president_signature_url TEXT,
  tresoriere_nom TEXT,
  tresoriere_fonction TEXT DEFAULT 'Trésorière',
  tresoriere_signature_url TEXT,
  devise_defaut TEXT NOT NULL DEFAULT 'XOF',
  prefixe_numerotation TEXT NOT NULL DEFAULT 'KPT-PAY',
  prochain_numero INTEGER NOT NULL DEFAULT 1,
  mention_legale TEXT DEFAULT 'Cette fiche constitue un justificatif interne de paiement en l''absence de reçu externe.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settings_association ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view settings" ON public.settings_association FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update settings" ON public.settings_association FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert settings" ON public.settings_association FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings_association FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-assign admin role to first user
CREATE OR REPLACE FUNCTION public.handle_first_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'admin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created_check_admin AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_first_user_admin();

-- Storage bucket for KPT files (logo, signatures)
INSERT INTO storage.buckets (id, name, public) VALUES ('kpt-files', 'kpt-files', true);

CREATE POLICY "Authenticated users can upload KPT files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kpt-files');
CREATE POLICY "Anyone can view KPT files" ON storage.objects FOR SELECT USING (bucket_id = 'kpt-files');
CREATE POLICY "Admins can delete KPT files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'kpt-files');
CREATE POLICY "Admins can update KPT files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'kpt-files');
