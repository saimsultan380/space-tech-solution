-- Aggregated leaderboard for Sales Agents.
-- Uses SECURITY DEFINER to safely bypass sales/chargebacks RLS and return only aggregated metrics.

CREATE OR REPLACE FUNCTION public.get_sales_leaderboard()
RETURNS TABLE (
  agent_id uuid,
  agent_name text,
  avatar_url text,
  total_sales integer,
  approved_sales integer,
  rejected_sales integer,
  revenue numeric,
  chargebacks integer,
  conversion_rate integer,
  rank integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id AS agent_id,
    u.full_name AS agent_name,
    u.avatar_url AS avatar_url,
    COALESCE(s.total_sales, 0)::int AS total_sales,
    COALESCE(s.approved_sales, 0)::int AS approved_sales,
    COALESCE(s.rejected_sales, 0)::int AS rejected_sales,
    COALESCE(s.revenue, 0)::numeric AS revenue,
    COALESCE(cb.chargebacks, 0)::int AS chargebacks,
    CASE
      WHEN COALESCE(s.total_sales, 0) > 0
        THEN ROUND((COALESCE(s.approved_sales, 0)::numeric / s.total_sales) * 100)::int
      ELSE 0
    END AS conversion_rate,
    (ROW_NUMBER() OVER (ORDER BY COALESCE(s.revenue, 0) DESC, COALESCE(s.approved_sales, 0) DESC, u.full_name ASC))::int AS rank
  FROM public.users u
  LEFT JOIN (
    SELECT
      agent_id,
      COUNT(*)::int AS total_sales,
      COUNT(*) FILTER (WHERE status <> 'rejected')::int AS approved_sales,
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected_sales,
      COALESCE(SUM(CASE WHEN status <> 'rejected' THEN charged_amount ELSE 0 END), 0)::numeric AS revenue
    FROM public.sales
    GROUP BY agent_id
  ) s ON s.agent_id = u.id
  LEFT JOIN (
    SELECT
      s.agent_id,
      COUNT(cb.id)::int AS chargebacks
    FROM public.chargebacks cb
    JOIN public.sales s ON s.id = cb.sale_id
    GROUP BY s.agent_id
  ) cb ON cb.agent_id = u.id
  WHERE u.role = 'sales_agent' AND u.is_active = true;
$$;

REVOKE ALL ON FUNCTION public.get_sales_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sales_leaderboard() TO authenticated;
