-- ============================================
-- Processing Accounts Table
-- Stores checking accounts used for daily sales processing
-- ============================================

CREATE TABLE public.processing_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_holder_name TEXT NOT NULL,
  routing_number_encrypted TEXT NOT NULL,
  account_number_encrypted TEXT NOT NULL,
  billing_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'not_working', 'closed', 'reversal_issue', 'under_review')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_processing_accounts_status ON public.processing_accounts(status);
CREATE INDEX idx_processing_accounts_created_by ON public.processing_accounts(created_by);
CREATE INDEX idx_processing_accounts_account_holder ON public.processing_accounts(account_holder_name);
CREATE INDEX idx_processing_accounts_created_at ON public.processing_accounts(created_at DESC);

-- Row Level Security
ALTER TABLE public.processing_accounts ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins full access on processing_accounts"
  ON public.processing_accounts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Sales agents and processors can view all and create
CREATE POLICY "Sales agents and processors can view processing_accounts"
  ON public.processing_accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('sales_agent', 'processor')
    )
  );

CREATE POLICY "Sales agents and processors can create processing_accounts"
  ON public.processing_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('sales_agent', 'processor')
    )
  );

-- Sales agents and processors can update their own accounts
CREATE POLICY "Sales agents and processors can update own processing_accounts"
  ON public.processing_accounts
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('sales_agent', 'processor')
    )
  );

-- Sales agents and processors can delete their own accounts
CREATE POLICY "Sales agents and processors can delete own processing_accounts"
  ON public.processing_accounts
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('sales_agent', 'processor')
    )
  );
