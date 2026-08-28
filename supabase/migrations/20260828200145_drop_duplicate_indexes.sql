-- Performance: remove exactly-duplicated indexes.
--
-- Repeated migration numbers (039, 058, 006, 007, 008, 009) caused the same index to
-- be created twice under two names. Duplicates cost write amplification on every
-- insert/update and inflate planning time -- a 10-row customers lookup was touching
-- 419 buffers just to plan. Each pair below has an identical definition, is
-- non-unique, and backs no constraint, so the retained index fully covers the dropped
-- one and no query plan can regress.

drop index if exists public.idx_attendance_user_date_today;              -- = idx_attendance_user_date_desc
drop index if exists public.idx_chargebacks_sale;                        -- = idx_chargebacks_sale_id
drop index if exists public.idx_leaves_approver;                         -- = idx_leaves_approver_id
drop index if exists public.idx_leaves_user;                             -- = idx_leaves_user_id
drop index if exists public.idx_marketing_budget_transactions_campaign;  -- = ..._campaign_id
drop index if exists public.idx_marketing_daily_call_logs_campaign;      -- = ..._campaign_id
drop index if exists public.idx_marketing_daily_call_logs_user;          -- = ..._user_id
drop index if exists public.idx_marketing_daily_campaign_budgets_campaign; -- = ..._campaign_id
drop index if exists public.idx_notes_user;                              -- = idx_notes_user_id
drop index if exists public.idx_payments_customer;                       -- = idx_payments_customer_id
drop index if exists public.idx_payslips_user;                           -- = idx_payslips_user_id
drop index if exists public.idx_proc_acc_holder;                         -- = idx_processing_accounts_account_holder
drop index if exists public.idx_proc_acc_status;                         -- = idx_processing_accounts_status
drop index if exists public.idx_sales_agent;                             -- = idx_sales_agent_id
drop index if exists public.idx_sales_created;                           -- = idx_sales_created_at
