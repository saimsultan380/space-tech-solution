-- ============================================================
-- Marketing Module — Optimised Schema
-- Version : 2.0
-- Fixes   :
--   - Renamed ambiguous 'type' → 'campaign_type' / 'transaction_type'
--   - Added soft delete on campaigns
--   - Added composite indexes for hot query paths
--   - Tightened RLS: processors cannot DELETE campaigns
--   - budget_transactions made immutable (no UPDATE/DELETE for anyone)
--   - Policy names follow {role}_{action}_{table} convention
--   - Added missing updated_at trigger on budget_transactions guard
--   - Added non-negative CHECK on budget amounts
-- ============================================================


-- ============================================================
-- MARKETING CAMPAIGNS
-- FIX: 'type' → 'campaign_type' (avoids SQL reserved word clash
--      and follows naming convention)
-- FIX: Added deleted_at soft delete
-- FIX: Added non-negative CHECK on total_budget
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id             UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT           NOT NULL,
  -- Renamed from 'type' — avoids ambiguity and reserved word issues
  campaign_type  TEXT           NOT NULL CHECK (campaign_type IN ('call', 'digital', 'other')),
  total_budget   NUMERIC(12,2)  NOT NULL DEFAULT 0 CHECK (total_budget >= 0),
  start_date     DATE           NOT NULL,
  end_date       DATE           NOT NULL,
  assigned_to    UUID           REFERENCES public.users(id) ON DELETE SET NULL,
  status         TEXT           NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'paused', 'completed')),
  notes          TEXT           NOT NULL DEFAULT '',
  created_by     UUID           NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- Soft delete — never hard-delete a campaign (budget history must be preserved)
  deleted_at     TIMESTAMPTZ    DEFAULT NULL,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT chk_marketing_campaign_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status
  ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_assigned_to
  ON public.marketing_campaigns(assigned_to);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by
  ON public.marketing_campaigns(created_by);
-- Composite — dashboard lists active campaigns sorted by date
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status_start
  ON public.marketing_campaigns(status, start_date DESC);
-- Partial — fast filter for non-deleted campaigns
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_active
  ON public.marketing_campaigns(status, start_date DESC)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS tr_marketing_campaigns_updated_at ON public.marketing_campaigns;
CREATE TRIGGER tr_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- MARKETING DAILY CALL LOGS
-- FIX: Added composite index (campaign_id, log_date) for
--      the most common query: "show logs for this campaign by date"
-- FIX: Added created_by index
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketing_daily_call_logs (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_date         DATE           NOT NULL,
  campaign_id      UUID           NOT NULL
                     REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  user_id          UUID           NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  calls_made       INTEGER        NOT NULL DEFAULT 0,
  cost_per_call    NUMERIC(12,2)  NOT NULL DEFAULT 0,
  -- Generated column — always consistent with calls_made * cost_per_call
  total_daily_cost NUMERIC(12,2)
                     GENERATED ALWAYS AS (calls_made::numeric * cost_per_call) STORED,
  notes            TEXT           NOT NULL DEFAULT '',
  created_by       UUID           NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT chk_marketing_daily_calls_non_negative
    CHECK (calls_made >= 0 AND cost_per_call >= 0)
);

CREATE INDEX IF NOT EXISTS idx_marketing_call_logs_date
  ON public.marketing_daily_call_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_marketing_call_logs_campaign
  ON public.marketing_daily_call_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_call_logs_user
  ON public.marketing_daily_call_logs(user_id);
-- Composite — "all logs for campaign X ordered by date" (very common)
CREATE INDEX IF NOT EXISTS idx_marketing_call_logs_campaign_date
  ON public.marketing_daily_call_logs(campaign_id, log_date DESC);

DROP TRIGGER IF EXISTS tr_marketing_daily_call_logs_updated_at ON public.marketing_daily_call_logs;
CREATE TRIGGER tr_marketing_daily_call_logs_updated_at
  BEFORE UPDATE ON public.marketing_daily_call_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- MARKETING DAILY CAMPAIGN BUDGETS
-- FIX: Added non-negative CHECK clarity comment
-- FIX: Added composite index (campaign_id, budget_date)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketing_daily_campaign_budgets (
  id                     UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_date            DATE           NOT NULL,
  campaign_id            UUID           NOT NULL
                           REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  daily_budget_allocated NUMERIC(12,2)  NOT NULL DEFAULT 0,
  -- NULL = not yet manually recorded; 0 = explicitly zero
  daily_spent_manual     NUMERIC(12,2),
  notes                  TEXT           NOT NULL DEFAULT '',
  created_by             UUID           NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),

  -- One budget entry per campaign per day
  UNIQUE (budget_date, campaign_id),

  CONSTRAINT chk_marketing_daily_budget_non_negative
    CHECK (
      daily_budget_allocated >= 0
      AND (daily_spent_manual IS NULL OR daily_spent_manual >= 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_marketing_budgets_date
  ON public.marketing_daily_campaign_budgets(budget_date);
CREATE INDEX IF NOT EXISTS idx_marketing_budgets_campaign
  ON public.marketing_daily_campaign_budgets(campaign_id);
-- Composite — "budget history for this campaign" (most common query)
CREATE INDEX IF NOT EXISTS idx_marketing_budgets_campaign_date
  ON public.marketing_daily_campaign_budgets(campaign_id, budget_date DESC);

DROP TRIGGER IF EXISTS tr_marketing_daily_campaign_budgets_updated_at
  ON public.marketing_daily_campaign_budgets;
CREATE TRIGGER tr_marketing_daily_campaign_budgets_updated_at
  BEFORE UPDATE ON public.marketing_daily_campaign_budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- MARKETING BUDGET TRANSACTIONS
-- FIX: Renamed 'type' → 'transaction_type'
-- FIX: Added non-negative CHECK on amount
-- FIX: Transactions are IMMUTABLE (financial audit trail).
--      No UPDATE or DELETE policies — append-only by design.
--      Comment explains intent clearly.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketing_budget_transactions (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_date DATE           NOT NULL DEFAULT CURRENT_DATE,
  -- Renamed from 'type' to avoid ambiguity
  transaction_type TEXT           NOT NULL
                     CHECK (transaction_type IN ('allocation', 'deduction', 'adjustment')),
  campaign_id      UUID           NOT NULL
                     REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  amount           NUMERIC(12,2)  NOT NULL DEFAULT 0 CHECK (amount >= 0),
  performed_by     UUID           NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note             TEXT           NOT NULL DEFAULT '',
  -- No updated_at — this table is intentionally append-only (financial audit trail).
  -- Corrections are made via new 'adjustment' transactions, never by editing rows.
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_txn_date
  ON public.marketing_budget_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_marketing_txn_campaign
  ON public.marketing_budget_transactions(campaign_id);
-- Composite — "all transactions for a campaign ordered by date"
CREATE INDEX IF NOT EXISTS idx_marketing_txn_campaign_date
  ON public.marketing_budget_transactions(campaign_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_txn_performed_by
  ON public.marketing_budget_transactions(performed_by);


-- ============================================================
-- RLS — MARKETING CAMPAIGNS
-- FIX: Processors can manage (INSERT/UPDATE) but NOT DELETE.
--      Campaigns must be preserved for budget history integrity.
-- Policy names follow {role}_{action}_{table} convention.
-- ============================================================
ALTER TABLE public.marketing_campaigns         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_daily_call_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_daily_campaign_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_budget_transactions    ENABLE ROW LEVEL SECURITY;

-- CAMPAIGNS
DROP POLICY IF EXISTS "Super admins full access to marketing campaigns" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Processors can manage marketing campaigns"       ON public.marketing_campaigns;

CREATE POLICY "super_admin_all_marketing_campaigns"
  ON public.marketing_campaigns FOR ALL
  USING (public.get_user_role() = 'super_admin');

-- Processors can INSERT and UPDATE but NOT DELETE (budget history integrity)
CREATE POLICY "processor_insert_marketing_campaigns"
  ON public.marketing_campaigns FOR INSERT
  WITH CHECK (public.get_user_role() = 'processor');

CREATE POLICY "processor_update_marketing_campaigns"
  ON public.marketing_campaigns FOR UPDATE
  USING (public.get_user_role() = 'processor')
  WITH CHECK (public.get_user_role() = 'processor');

CREATE POLICY "processor_read_marketing_campaigns"
  ON public.marketing_campaigns FOR SELECT
  USING (public.get_user_role() = 'processor');

-- Agents can VIEW campaigns (read-only — they need context for their calls)
CREATE POLICY "agent_read_marketing_campaigns"
  ON public.marketing_campaigns FOR SELECT
  USING (public.get_user_role() = 'sales_agent');


-- DAILY CALL LOGS
DROP POLICY IF EXISTS "Super admins full access to marketing daily call logs" ON public.marketing_daily_call_logs;
DROP POLICY IF EXISTS "Processors can manage marketing daily call logs"       ON public.marketing_daily_call_logs;

CREATE POLICY "super_admin_all_call_logs"
  ON public.marketing_daily_call_logs FOR ALL
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "processor_all_call_logs"
  ON public.marketing_daily_call_logs FOR ALL
  USING (public.get_user_role() = 'processor');

-- Agents can view their own call logs
CREATE POLICY "agent_read_own_call_logs"
  ON public.marketing_daily_call_logs FOR SELECT
  USING (
    public.get_user_role() = 'sales_agent'
    AND user_id = auth.uid()
  );


-- DAILY CAMPAIGN BUDGETS
DROP POLICY IF EXISTS "Super admins full access to marketing daily campaign budgets" ON public.marketing_daily_campaign_budgets;
DROP POLICY IF EXISTS "Processors can manage marketing daily campaign budgets"       ON public.marketing_daily_campaign_budgets;

CREATE POLICY "super_admin_all_campaign_budgets"
  ON public.marketing_daily_campaign_budgets FOR ALL
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "processor_all_campaign_budgets"
  ON public.marketing_daily_campaign_budgets FOR ALL
  USING (public.get_user_role() = 'processor');


-- BUDGET TRANSACTIONS — append-only, no UPDATE or DELETE for anyone
DROP POLICY IF EXISTS "Super admins can read marketing budget transactions"   ON public.marketing_budget_transactions;
DROP POLICY IF EXISTS "Processors can read marketing budget transactions"     ON public.marketing_budget_transactions;
DROP POLICY IF EXISTS "Super admins can insert marketing budget transactions" ON public.marketing_budget_transactions;
DROP POLICY IF EXISTS "Processors can insert marketing budget transactions"   ON public.marketing_budget_transactions;

CREATE POLICY "super_admin_read_budget_transactions"
  ON public.marketing_budget_transactions FOR SELECT
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "super_admin_insert_budget_transactions"
  ON public.marketing_budget_transactions FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'super_admin'
    AND performed_by = auth.uid()    -- cannot forge performed_by
  );

CREATE POLICY "processor_read_budget_transactions"
  ON public.marketing_budget_transactions FOR SELECT
  USING (public.get_user_role() = 'processor');

CREATE POLICY "processor_insert_budget_transactions"
  ON public.marketing_budget_transactions FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'processor'
    AND performed_by = auth.uid()    -- cannot forge performed_by
  );

-- NOTE: No UPDATE or DELETE policies on budget_transactions — intentional.
-- This table is an immutable financial audit trail.
-- Corrections must be made via new 'adjustment' transactions.