-- ============================================
-- Payslips module
-- ============================================

CREATE TABLE public.payslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PKR',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payslip_period_valid CHECK (period_end >= period_start)
);

CREATE INDEX idx_payslips_user ON public.payslips(user_id);
CREATE INDEX idx_payslips_period ON public.payslips(period_start, period_end);
CREATE INDEX idx_payslips_pay_date ON public.payslips(pay_date);
CREATE INDEX idx_payslips_status ON public.payslips(status);

CREATE TRIGGER tr_payslips_updated_at BEFORE UPDATE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to payslips"
  ON public.payslips FOR ALL
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Users can view their own payslips"
  ON public.payslips FOR SELECT
  USING (user_id = auth.uid());
