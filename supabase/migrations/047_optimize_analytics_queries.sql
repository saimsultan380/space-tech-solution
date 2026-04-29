-- Migration: 047_optimize_analytics_queries.sql
-- Description: Optimize get_dashboard_analytics to reduce subqueries and table scans.

CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(month_filter text DEFAULT NULL)
RETURNS TABLE (
  total_sales bigint,
  rejected_sales bigint,
  total_revenue numeric,
  total_customers bigint,
  total_chargebacks bigint,
  open_chargebacks bigint,
  total_call_logs bigint,
  total_processing_accounts bigint,
  pending_leaves bigint,
  today_on_leave bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  month_start timestamptz;
  month_end timestamptz;
  today_date date := current_date;
  s_total bigint;
  s_rejected bigint;
  s_revenue numeric;
  c_total bigint;
  cb_total bigint;
  cb_open bigint;
  cl_total bigint;
  pa_total bigint;
  l_pending bigint;
  l_today bigint;
BEGIN
  IF month_filter IS NOT NULL AND month_filter <> '' THEN
    month_start := (month_filter || '-01')::timestamptz;
    month_end := (month_start + interval '1 month');
  END IF;

  -- 1. Optimized Sales Aggregation (Single scan)
  SELECT 
    COUNT(*), 
    COUNT(*) FILTER (WHERE status = 'rejected'),
    COALESCE(SUM(charged_amount) FILTER (WHERE status <> 'rejected'), 0)
  INTO s_total, s_rejected, s_revenue
  FROM sales
  WHERE (month_start IS NULL OR (created_at >= month_start AND created_at < month_end))
    AND deleted_at IS NULL;

  -- 2. Optimized Customers Aggregation (Single scan)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE source = 'call_log')
  INTO c_total, cl_total
  FROM customers
  WHERE (month_start IS NULL OR (created_at >= month_start AND created_at < month_end))
    AND deleted_at IS NULL;

  -- 3. Optimized Chargebacks Aggregation (Single scan)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'open')
  INTO cb_total, cb_open
  FROM chargebacks
  WHERE (month_start IS NULL OR (created_at >= month_start AND created_at < month_end))
    AND deleted_at IS NULL;

  -- 4. Processing Accounts
  SELECT COUNT(*) INTO pa_total
  FROM processing_accounts
  WHERE (month_start IS NULL OR (created_at >= month_start AND created_at < month_end))
    AND deleted_at IS NULL;

  -- 5. Leaves Aggregation
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'approved' AND today_date BETWEEN start_date AND end_date)
  INTO l_pending, l_today
  FROM leaves
  WHERE (month_start IS NULL OR (created_at >= month_start AND created_at < month_end))
    AND deleted_at IS NULL;

  RETURN QUERY SELECT 
    s_total, s_rejected, s_revenue, 
    c_total, cb_total, cb_open, 
    cl_total, pa_total, l_pending, l_today;
END;
$$;
