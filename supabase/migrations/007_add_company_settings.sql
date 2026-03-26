-- Company branding/settings for PDF templates (payslip)

CREATE TABLE IF NOT EXISTS public.company_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  company_name TEXT NOT NULL DEFAULT 'SPACE TECH',
  address_line TEXT NOT NULL DEFAULT 'Sector J Dha Phase 1, Lahore',
  contact_email TEXT NOT NULL DEFAULT 'contact@spacetechsolution.com',
  logo_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure a single row exists
INSERT INTO public.company_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read company settings" ON public.company_settings;
CREATE POLICY "Authenticated users can read company settings"
  ON public.company_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Super admins can update company settings" ON public.company_settings;
CREATE POLICY "Super admins can update company settings"
  ON public.company_settings FOR UPDATE
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

