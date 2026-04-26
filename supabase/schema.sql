-- ============================================
-- LAGUNE GRANDE CRM — Schema Supabase
-- Coller dans SQL Editor > New Query > Run
-- ============================================

-- 1. TABLE USERS (profils liés à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'commercial')),
  color TEXT DEFAULT '#2a7a8a',
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies profiles
CREATE POLICY "Profiles visibles par tous les connectés" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin peut tout modifier" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. TABLE LEADS
CREATE TABLE IF NOT EXISTS public.leads (
  id BIGSERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  tel TEXT NOT NULL,
  email TEXT,
  source TEXT DEFAULT 'Autre' CHECK (source IN ('Facebook','Instagram','Google','TikTok','Site web','Référence','Autre')),
  budget TEXT,
  projet TEXT DEFAULT 'Lagune Grande Sidi Rahal',
  statut TEXT DEFAULT 'Nouveau' CHECK (statut IN ('Nouveau','Contacté','Relance 1','Relance 2','Relance 3','RDV Planifié','RDV Fait','Chaud','Vendu','Perdu')),
  motif_perdu TEXT,
  relance_date TIMESTAMPTZ,
  assigne_id UUID REFERENCES public.profiles(id),
  notes TEXT DEFAULT '',
  commentaire_interne TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policies leads
CREATE POLICY "Admin et manager voient tout" ON public.leads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
  );

CREATE POLICY "Commercial voit ses leads" ON public.leads
  FOR SELECT USING (assigne_id = auth.uid());

CREATE POLICY "Admin peut tout modifier leads" ON public.leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Commercial peut modifier ses leads" ON public.leads
  FOR UPDATE USING (assigne_id = auth.uid());

CREATE POLICY "Manager peut modifier tous les leads" ON public.leads
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager','admin'))
  );

-- 3. TABLE LOGS (historique des actions)
CREATE TABLE IF NOT EXISTS public.lead_logs (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES public.leads(id) ON DELETE CASCADE,
  auteur_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  result TEXT,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lead_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logs visibles par tous les connectés" ON public.lead_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Tout connecté peut créer un log" ON public.lead_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. TRIGGER updated_at sur leads
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. FONCTION pour créer profil auto après signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nom, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'commercial')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- DONE ! Tables créées :
-- public.profiles, public.leads, public.lead_logs
-- ============================================
