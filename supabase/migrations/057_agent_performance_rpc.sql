-- ============================================================
-- 057: Agent Performance Stats RPC
-- Purpose: Replace 4 separate client queries + JS aggregation
--          with a single DB-side computation. Reduces per-user
--          page-load DB traffic from ~2000 rows to ~10 numbers.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_agent_performance_stats(p_agent_id uuid)
RETURNS TABLE (
  total_sales          bigint,
  approved_sales       bigint,
  rejected_sales       bigint,
  total_revenue        numeric,
  month_sales          bigint,
  month_revenue        numeric,
  quarter_sales        bigint,
  quarter_revenue      numeric,
  total_chargebacks    bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start   date := date_trunc('month', current_date)::date;
  v_quarter_start date := date_trunc('quarter', current_date)::date;
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint                                                                                         AS total_sales,
    COUNT(*) FILTER (WHERE status != 'rejected')::bigint                                                    AS approved_sales,
    COUNT(*) FILTER (WHERE status = 'rejected')::bigint                                                     AS rejected_sales,
    COALESCE(SUM(charged_amount) FILTER (WHERE status != 'rejected'), 0)                                    AS total_revenue,
    COUNT(*)         FILTER (WHERE created_at::date >= v_month_start)::bigint                               AS month_sales,
    COALESCE(SUM(charged_amount) FILTER (WHERE status != 'rejected' AND created_at::date >= v_month_start), 0) AS month_revenue,
    COUNT(*)         FILTER (WHERE created_at::date >= v_quarter_start)::bigint                             AS quarter_sales,
    COALESCE(SUM(charged_amount) FILTER (WHERE status != 'rejected' AND created_at::date >= v_quarter_start), 0) AS quarter_revenue,
    (
      SELECT COUNT(*)::bigint
      FROM   public.chargebacks cb
      JOIN   public.sales s ON s.id = cb.sale_id
      WHERE  s.agent_id   = p_agent_id
        AND  cb.deleted_at IS NULL
        AND  s.deleted_at  IS NULL
    )                                                                                                       AS total_chargebacks
  FROM public.sales
  WHERE agent_id   = p_agent_id
    AND deleted_at IS NULL;
END;
$$;

-- Also create a combined trends RPC to replace getAgentMonthlySalesTrends
CREATE OR REPLACE FUNCTION public.get_agent_monthly_trends(p_agent_id uuid, p_months int DEFAULT 6)
RETURNS TABLE (
  month_key  text,
  sales      bigint,
  revenue    numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(date_trunc('month', created_at), 'YYYY-MM') AS month_key,
    COUNT(*)::bigint                                     AS sales,
    COALESCE(SUM(charged_amount) FILTER (WHERE status != 'rejected'), 0) AS revenue
  FROM public.sales
  WHERE agent_id   = p_agent_id
    AND deleted_at IS NULL
    AND created_at >= date_trunc('month', current_date) - ((p_months - 1) * interval '1 month')
  GROUP BY date_trunc('month', created_at)
  ORDER BY date_trunc('month', created_at);
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_agent_performance_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_agent_monthly_trends(uuid, int)  TO authenticated;
