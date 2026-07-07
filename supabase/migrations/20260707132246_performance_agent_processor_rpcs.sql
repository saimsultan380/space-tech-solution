-- ============================================================
-- Performance: Agent & Processor dashboard stats RPCs
-- Collapses 3 round-trips → 1 for agent dashboard,
-- and 2 round-trips → 1 for processor dashboard.
-- ============================================================

-- ── 1. Agent dashboard stats ─────────────────────────────────────────────────
-- Returns all-time + current-month + today stats for a given agent in one call.

CREATE OR REPLACE FUNCTION public.get_agent_dashboard_stats(
  p_agent_id  uuid,
  p_month     text   -- format: 'YYYY-MM'
)
RETURNS TABLE (
  total_sales        bigint,
  pending_sales      bigint,
  approved_sales     bigint,
  rejected_sales     bigint,
  total_revenue      numeric,
  month_sales        bigint,
  month_revenue      numeric,
  today_sales        bigint,
  today_revenue      numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start timestamptz;
  v_month_end   timestamptz;
  v_today_start timestamptz;
  v_today_end   timestamptz;
BEGIN
  v_month_start := (p_month || '-01')::date;
  v_month_end   := v_month_start + interval '1 month';
  v_today_start := current_date::timestamptz;
  v_today_end   := v_today_start + interval '1 day';

  RETURN QUERY
  SELECT
    COUNT(*)                                                              AS total_sales,
    COUNT(*) FILTER (WHERE s.status = 'pending')                         AS pending_sales,
    COUNT(*) FILTER (WHERE s.status = 'approved')                        AS approved_sales,
    COUNT(*) FILTER (WHERE s.status = 'rejected')                        AS rejected_sales,
    COALESCE(SUM(s.charged_amount), 0)                                   AS total_revenue,
    COUNT(*) FILTER (WHERE s.created_at >= v_month_start
                       AND s.created_at < v_month_end)                   AS month_sales,
    COALESCE(SUM(s.charged_amount) FILTER (
               WHERE s.created_at >= v_month_start
                 AND s.created_at < v_month_end), 0)                     AS month_revenue,
    COUNT(*) FILTER (WHERE s.created_at >= v_today_start
                       AND s.created_at < v_today_end)                   AS today_sales,
    COALESCE(SUM(s.charged_amount) FILTER (
               WHERE s.created_at >= v_today_start
                 AND s.created_at < v_today_end), 0)                     AS today_revenue
  FROM sales s
  WHERE s.agent_id = p_agent_id
    AND s.deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_agent_dashboard_stats(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_agent_dashboard_stats(uuid, text) TO authenticated;


-- ── 2. Processor dashboard stats ─────────────────────────────────────────────
-- Returns total sales count + this week's count and revenue in one call.

CREATE OR REPLACE FUNCTION public.get_processor_dashboard_stats()
RETURNS TABLE (
  total_sales          bigint,
  sales_this_week      bigint,
  week_recorded_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start timestamptz;
BEGIN
  -- Start of the current week (Sunday)
  v_week_start := date_trunc('week', now());

  RETURN QUERY
  SELECT
    COUNT(*)                                                              AS total_sales,
    COUNT(*)    FILTER (WHERE s.created_at >= v_week_start)              AS sales_this_week,
    COALESCE(SUM(s.charged_amount) FILTER (
               WHERE s.created_at >= v_week_start), 0)                   AS week_recorded_revenue
  FROM sales s
  WHERE s.deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_processor_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_processor_dashboard_stats() TO authenticated;
