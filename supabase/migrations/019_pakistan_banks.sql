-- Reference banks (Pakistan + custom additions) for salary payment dropdown

CREATE TABLE IF NOT EXISTS public.banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT banks_name_unique UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_banks_name ON public.banks (name);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bank_name TEXT;

COMMENT ON COLUMN public.users.bank_name IS 'Salary bank institution name (from banks list or custom)';

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read banks"
  ON public.banks FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can insert banks"
  ON public.banks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

-- Seed major Pakistan banks (idempotent)
INSERT INTO public.banks (name) VALUES
  ('Habib Bank Limited (HBL)'),
  ('MCB Bank Limited'),
  ('National Bank of Pakistan (NBP)'),
  ('United Bank Limited (UBL)'),
  ('Allied Bank Limited (ABL)'),
  ('Bank Alfalah Limited'),
  ('Meezan Bank Limited'),
  ('Askari Bank Limited'),
  ('The Bank of Punjab (BOP)'),
  ('Faysal Bank Limited'),
  ('Soneri Bank Limited'),
  ('Bank AL Habib Limited'),
  ('BankIslami Pakistan Limited'),
  ('Dubai Islamic Bank Pakistan'),
  ('Silk Bank Limited'),
  ('Standard Chartered Bank (Pakistan)'),
  ('Habib Metropolitan Bank Limited'),
  ('JS Bank Limited'),
  ('Summit Bank Limited'),
  ('First Women Bank Limited'),
  ('Industrial and Commercial Bank of China (ICBC) Pakistan'),
  ('Samba Bank Limited'),
  ('Citi Bank N.A.'),
  ('Deutsche Bank A.G.'),
  ('Zarai Taraqiati Bank Limited (ZTBL)')
ON CONFLICT (name) DO NOTHING;
