-- ============================================
-- Marketing Entries Table
-- Simplified marketing budget tracking with daily entries
-- ============================================

CREATE TABLE public.marketing_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_date DATE NOT NULL,
  campaign TEXT NOT NULL CHECK (campaign IN ('energy', 'insurance', 'telecom')),
  budget_assigned NUMERIC(12,2) NOT NULL DEFAULT 0,
  calls_landed INTEGER NOT NULL DEFAULT 0,
  dropped_calls INTEGER NOT NULL DEFAULT 0,
  sales_acquired INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_entries_date ON public.marketing_entries(entry_date DESC);
CREATE INDEX idx_marketing_entries_campaign ON public.marketing_entries(campaign);
CREATE INDEX idx_marketing_entries_created_by ON public.marketing_entries(created_by);

-- Row Level Security
ALTER TABLE public.marketing_entries ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins full access on marketing_entries"
  ON public.marketing_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Processors can view all, create, update own, delete own
CREATE POLICY "Processors can view marketing_entries"
  ON public.marketing_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'processor'
    )
  );

CREATE POLICY "Processors can create marketing_entries"
  ON public.marketing_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'processor'
    )
  );

CREATE POLICY "Processors can update own marketing_entries"
  ON public.marketing_entries
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'processor'
    )
  );

CREATE POLICY "Processors can delete own marketing_entries"
  ON public.marketing_entries
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'processor'
    )
  );
