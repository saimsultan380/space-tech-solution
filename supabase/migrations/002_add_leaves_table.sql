  -- ============================================
  -- Leaves table for employee leave management
  -- ============================================

  CREATE TABLE public.leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sick', 'casual', 'annual', 'other')),
    reason TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approver_id UUID REFERENCES public.users(id),
    approver_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Indexes for common queries
  CREATE INDEX idx_leaves_user ON public.leaves(user_id);
  CREATE INDEX idx_leaves_status ON public.leaves(status);
  CREATE INDEX idx_leaves_start_date ON public.leaves(start_date);
  CREATE INDEX idx_leaves_approver ON public.leaves(approver_id);

  -- Auto-update updated_at trigger
  CREATE TRIGGER tr_leaves_updated_at BEFORE UPDATE ON public.leaves
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

  -- Enable Row Level Security
  ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

  -- ---- LEAVES policies ----

  -- Super admins can do everything
  CREATE POLICY "Super admins full access to leaves"
    ON public.leaves FOR ALL
    USING (public.get_user_role() = 'super_admin');

  -- Users can view their own leave requests
  CREATE POLICY "Users can view their own leaves"
    ON public.leaves FOR SELECT
    USING (user_id = auth.uid());

  -- Users can create their own leave requests
  CREATE POLICY "Users can create their own leaves"
    ON public.leaves FOR INSERT
    WITH CHECK (user_id = auth.uid());

  -- Users can update their own pending leave requests
  CREATE POLICY "Users can update their own pending leaves"
    ON public.leaves FOR UPDATE
    USING (user_id = auth.uid() AND status = 'pending')
    WITH CHECK (user_id = auth.uid());

  -- Users can delete their own pending leave requests
  CREATE POLICY "Users can delete their own pending leaves"
    ON public.leaves FOR DELETE
    USING (user_id = auth.uid() AND status = 'pending');
