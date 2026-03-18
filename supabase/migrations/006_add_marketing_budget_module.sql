CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('call', 'digital', 'other')),
  total_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_campaign_dates_valid CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.marketing_daily_call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_date DATE NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  calls_made INTEGER NOT NULL DEFAULT 0,
  cost_per_call NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_daily_cost NUMERIC(12,2) GENERATED ALWAYS AS (calls_made::numeric * cost_per_call) STORED,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_daily_calls_non_negative CHECK (calls_made >= 0 AND cost_per_call >= 0)
);

CREATE TABLE IF NOT EXISTS public.marketing_daily_campaign_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_date DATE NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  daily_budget_allocated NUMERIC(12,2) NOT NULL DEFAULT 0,
  daily_spent_manual NUMERIC(12,2),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (budget_date, campaign_id),
  CONSTRAINT marketing_daily_budget_non_negative CHECK (daily_budget_allocated >= 0 AND (daily_spent_manual IS NULL OR daily_spent_manual >= 0))
);

CREATE TABLE IF NOT EXISTS public.marketing_budget_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('allocation', 'deduction', 'adjustment')),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  performed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_assigned_to ON public.marketing_campaigns(assigned_to);
CREATE INDEX IF NOT EXISTS idx_marketing_daily_call_logs_date ON public.marketing_daily_call_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_marketing_daily_call_logs_campaign ON public.marketing_daily_call_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_daily_call_logs_user ON public.marketing_daily_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_daily_campaign_budgets_date ON public.marketing_daily_campaign_budgets(budget_date);
CREATE INDEX IF NOT EXISTS idx_marketing_daily_campaign_budgets_campaign ON public.marketing_daily_campaign_budgets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_budget_transactions_date ON public.marketing_budget_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_marketing_budget_transactions_campaign ON public.marketing_budget_transactions(campaign_id);

DROP TRIGGER IF EXISTS tr_marketing_campaigns_updated_at ON public.marketing_campaigns;
CREATE TRIGGER tr_marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_marketing_daily_call_logs_updated_at ON public.marketing_daily_call_logs;
CREATE TRIGGER tr_marketing_daily_call_logs_updated_at BEFORE UPDATE ON public.marketing_daily_call_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_marketing_daily_campaign_budgets_updated_at ON public.marketing_daily_campaign_budgets;
CREATE TRIGGER tr_marketing_daily_campaign_budgets_updated_at BEFORE UPDATE ON public.marketing_daily_campaign_budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_daily_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_daily_campaign_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_budget_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to marketing campaigns" ON public.marketing_campaigns;
CREATE POLICY "Super admins full access to marketing campaigns"
  ON public.marketing_campaigns FOR ALL
  USING (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Processors can manage marketing campaigns" ON public.marketing_campaigns;
CREATE POLICY "Processors can manage marketing campaigns"
  ON public.marketing_campaigns FOR ALL
  USING (public.get_user_role() = 'processor');

DROP POLICY IF EXISTS "Super admins full access to marketing daily call logs" ON public.marketing_daily_call_logs;
CREATE POLICY "Super admins full access to marketing daily call logs"
  ON public.marketing_daily_call_logs FOR ALL
  USING (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Processors can manage marketing daily call logs" ON public.marketing_daily_call_logs;
CREATE POLICY "Processors can manage marketing daily call logs"
  ON public.marketing_daily_call_logs FOR ALL
  USING (public.get_user_role() = 'processor');

DROP POLICY IF EXISTS "Super admins full access to marketing daily campaign budgets" ON public.marketing_daily_campaign_budgets;
CREATE POLICY "Super admins full access to marketing daily campaign budgets"
  ON public.marketing_daily_campaign_budgets FOR ALL
  USING (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Processors can manage marketing daily campaign budgets" ON public.marketing_daily_campaign_budgets;
CREATE POLICY "Processors can manage marketing daily campaign budgets"
  ON public.marketing_daily_campaign_budgets FOR ALL
  USING (public.get_user_role() = 'processor');

DROP POLICY IF EXISTS "Super admins can read marketing budget transactions" ON public.marketing_budget_transactions;
CREATE POLICY "Super admins can read marketing budget transactions"
  ON public.marketing_budget_transactions FOR SELECT
  USING (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Processors can read marketing budget transactions" ON public.marketing_budget_transactions;
CREATE POLICY "Processors can read marketing budget transactions"
  ON public.marketing_budget_transactions FOR SELECT
  USING (public.get_user_role() = 'processor');

DROP POLICY IF EXISTS "Super admins can insert marketing budget transactions" ON public.marketing_budget_transactions;
CREATE POLICY "Super admins can insert marketing budget transactions"
  ON public.marketing_budget_transactions FOR INSERT
  WITH CHECK (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Processors can insert marketing budget transactions" ON public.marketing_budget_transactions;
CREATE POLICY "Processors can insert marketing budget transactions"
  ON public.marketing_budget_transactions FOR INSERT
  WITH CHECK (public.get_user_role() = 'processor');
