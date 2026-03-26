-- ============================================
-- Sale attachments (documents / images)
-- ============================================

CREATE TABLE IF NOT EXISTS public.sale_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT '',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_attachments_sale_id ON public.sale_attachments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_attachments_created_at ON public.sale_attachments(created_at);

ALTER TABLE public.sale_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage sale attachments" ON public.sale_attachments;
DROP POLICY IF EXISTS "Users can view attachments for their sales" ON public.sale_attachments;
DROP POLICY IF EXISTS "Users can insert attachments for their sales" ON public.sale_attachments;
DROP POLICY IF EXISTS "Users can delete attachments for their sales" ON public.sale_attachments;

-- Super admins can do everything
CREATE POLICY "Super admins manage sale attachments"
  ON public.sale_attachments FOR ALL
  USING (public.get_user_role() = 'super_admin');

-- View: sale agent who owns the sale, processors, and super admins
CREATE POLICY "Users can view attachments for their sales"
  ON public.sale_attachments FOR SELECT
  USING (
    public.get_user_role() IN ('super_admin', 'processor')
    OR EXISTS (
      SELECT 1
      FROM public.sales s
      WHERE s.id = sale_attachments.sale_id
        AND s.agent_id = auth.uid()
    )
  );

-- Insert: sale agent who owns the sale, processors, and super admins
CREATE POLICY "Users can insert attachments for their sales"
  ON public.sale_attachments FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('super_admin', 'processor')
    OR EXISTS (
      SELECT 1
      FROM public.sales s
      WHERE s.id = sale_attachments.sale_id
        AND s.agent_id = auth.uid()
    )
  );

-- Delete: super admins OR sale agent who owns the sale
CREATE POLICY "Users can delete attachments for their sales"
  ON public.sale_attachments FOR DELETE
  USING (
    public.get_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM public.sales s
      WHERE s.id = sale_attachments.sale_id
        AND s.agent_id = auth.uid()
    )
  );

