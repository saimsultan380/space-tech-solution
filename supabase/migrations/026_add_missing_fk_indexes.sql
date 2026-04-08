-- Performance hardening: add covering indexes for common foreign keys.
-- Safe, non-breaking optimization (no data mutation).

-- Leaves
CREATE INDEX IF NOT EXISTS idx_leaves_user_id ON public.leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_approver_id ON public.leaves(approver_id);

-- Payslips
CREATE INDEX IF NOT EXISTS idx_payslips_user_id ON public.payslips(user_id);
CREATE INDEX IF NOT EXISTS idx_payslips_generated_by ON public.payslips(generated_by);

-- Sale attachments
CREATE INDEX IF NOT EXISTS idx_sale_attachments_uploaded_by ON public.sale_attachments(uploaded_by);

-- Chargebacks
CREATE INDEX IF NOT EXISTS idx_chargebacks_assigned_to ON public.chargebacks(assigned_to);

-- Processing accounts / marketing entries
CREATE INDEX IF NOT EXISTS idx_processing_accounts_created_by ON public.processing_accounts(created_by);
CREATE INDEX IF NOT EXISTS idx_marketing_entries_created_by ON public.marketing_entries(created_by);

-- Marketing module
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_assigned_to ON public.marketing_campaigns(assigned_to);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by ON public.marketing_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_marketing_daily_call_logs_campaign_id ON public.marketing_daily_call_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_daily_call_logs_user_id ON public.marketing_daily_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_daily_call_logs_created_by ON public.marketing_daily_call_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_marketing_daily_campaign_budgets_campaign_id ON public.marketing_daily_campaign_budgets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_daily_campaign_budgets_created_by ON public.marketing_daily_campaign_budgets(created_by);
CREATE INDEX IF NOT EXISTS idx_marketing_budget_transactions_campaign_id ON public.marketing_budget_transactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_budget_transactions_performed_by ON public.marketing_budget_transactions(performed_by);
