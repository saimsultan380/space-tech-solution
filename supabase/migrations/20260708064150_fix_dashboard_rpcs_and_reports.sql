-- ============================================================
-- Fix: Revenue sums excluded rejected sales, add reporting RPCs
-- ============================================================

-- ── 1. Fix get_agent_dashboard_stats — exclude rejected from revenue ──────────
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
    COUNT(*)                                                                       AS total_sales,
    COUNT(*) FILTER (WHERE s.status = 'pending')                                  AS pending_sales,
    COUNT(*) FILTER (WHERE s.status = 'approved')                                 AS approved_sales,
    COUNT(*) FILTER (WHERE s.status = 'rejected')                                 AS rejected_sales,
    -- Revenue: exclude rejected
    COALESCE(SUM(s.charged_amount) FILTER (WHERE s.status != 'rejected'), 0)      AS total_revenue,
    COUNT(*) FILTER (WHERE s.created_at >= v_month_start
                       AND s.created_at <  v_month_end)                           AS month_sales,
    COALESCE(SUM(s.charged_amount) FILTER (
               WHERE s.status != 'rejected'
                 AND s.created_at >= v_month_start
                 AND s.created_at <  v_month_end), 0)                             AS month_revenue,
    COUNT(*) FILTER (WHERE s.created_at >= v_today_start
                       AND s.created_at <  v_today_end)                           AS today_sales,
    COALESCE(SUM(s.charged_amount) FILTER (
               WHERE s.status != 'rejected'
                 AND s.created_at >= v_today_start
                 AND s.created_at <  v_today_end), 0)                             AS today_revenue
  FROM sales s
  WHERE s.agent_id    = p_agent_id
    AND s.deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_agent_dashboard_stats(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_agent_dashboard_stats(uuid, text) TO authenticated;


-- ── 2. Fix get_processor_dashboard_stats — exclude rejected from revenue ──────
CREATE OR REPLACE FUNCTION public.get_processor_dashboard_stats()
RETURNS TABLE (
  total_sales           bigint,
  sales_this_week       bigint,
  week_recorded_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rolling_start timestamptz;
BEGIN
  -- Rolling 7-day window (matches the "7 days" label shown in the UI)
  v_rolling_start := now() - interval '7 days';

  RETURN QUERY
  SELECT
    COUNT(*)                                                                         AS total_sales,
    COUNT(*)    FILTER (WHERE s.created_at >= v_rolling_start)                      AS sales_this_week,
    COALESCE(SUM(s.charged_amount) FILTER (
               WHERE s.created_at >= v_rolling_start
                 AND s.status != 'rejected'), 0)                                    AS week_recorded_revenue
  FROM sales s
  WHERE s.deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_processor_dashboard_stats() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_processor_dashboard_stats() TO authenticated;


-- ── 3. get_employee_monthly_stats — replaces 5 client-side browser queries ────
-- Single DB call: returns per-user sales, revenue, attendance, call-logs,
-- and chargeback stats for the given month.
CREATE OR REPLACE FUNCTION public.get_employee_monthly_stats(p_month text)
RETURNS TABLE (
  id                  uuid,
  full_name           text,
  role                text,
  total_sales         bigint,
  approved_sales      bigint,
  rejected_sales      bigint,
  revenue             numeric,
  days_present        bigint,
  total_hours         numeric,
  call_log_responses  bigint,
  chargebacks         bigint,
  chargeback_ratio    numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start timestamptz;
  v_month_end   timestamptz;
  v_date_start  date;
  v_date_end    date;
BEGIN
  v_date_start  := (p_month || '-01')::date;
  v_date_end    := v_date_start + interval '1 month';
  v_month_start := v_date_start::timestamptz;
  v_month_end   := v_date_end::timestamptz;

  RETURN QUERY
  WITH
  month_sales AS (
    SELECT
      s.agent_id,
      COUNT(*)                                                        AS total_sales,
      COUNT(*) FILTER (WHERE s.status != 'rejected')                 AS approved_sales,
      COUNT(*) FILTER (WHERE s.status  = 'rejected')                 AS rejected_sales,
      COALESCE(SUM(s.charged_amount)
               FILTER (WHERE s.status != 'rejected'), 0)             AS revenue
    FROM sales s
    WHERE s.created_at >= v_month_start
      AND s.created_at <  v_month_end
      AND s.deleted_at IS NULL
    GROUP BY s.agent_id
  ),
  month_attendance AS (
    SELECT
      a.user_id,
      COUNT(*)                                                        AS days_present,
      COALESCE(SUM(
        CASE WHEN a.check_out IS NOT NULL
             THEN EXTRACT(EPOCH FROM (a.check_out::timestamptz - a.check_in::timestamptz)) / 3600.0
             ELSE 0 END
      ), 0)                                                           AS total_hours
    FROM attendance a
    WHERE a.date >= v_date_start
      AND a.date <  v_date_end
    GROUP BY a.user_id
  ),
  month_call_logs AS (
    SELECT c.created_by, COUNT(*) AS call_log_responses
    FROM customers c
    WHERE c.source       = 'call_log'
      AND c.created_at  >= v_month_start
      AND c.created_at  <  v_month_end
      AND c.deleted_at  IS NULL
    GROUP BY c.created_by
  ),
  month_chargebacks AS (
    SELECT s.agent_id, COUNT(DISTINCT cb.id) AS chargeback_count
    FROM chargebacks cb
    JOIN sales s ON s.id = cb.sale_id
    WHERE cb.created_at >= v_month_start
      AND cb.created_at <  v_month_end
    GROUP BY s.agent_id
  )
  SELECT
    u.id,
    u.full_name,
    u.role,
    COALESCE(ms.total_sales,    0)                                    AS total_sales,
    COALESCE(ms.approved_sales, 0)                                    AS approved_sales,
    COALESCE(ms.rejected_sales, 0)                                    AS rejected_sales,
    COALESCE(ms.revenue,        0)                                    AS revenue,
    COALESCE(ma.days_present,   0)                                    AS days_present,
    ROUND(COALESCE(ma.total_hours, 0)::numeric, 1)                    AS total_hours,
    COALESCE(cl.call_log_responses, 0)                                AS call_log_responses,
    COALESCE(mcb.chargeback_count,  0)                                AS chargebacks,
    CASE
      WHEN COALESCE(ms.total_sales, 0) > 0
      THEN ROUND(
             (COALESCE(mcb.chargeback_count, 0)::numeric /
              ms.total_sales::numeric) * 100, 1)
      ELSE 0
    END                                                               AS chargeback_ratio
  FROM users u
  LEFT JOIN month_sales       ms  ON ms.agent_id  = u.id
  LEFT JOIN month_attendance  ma  ON ma.user_id   = u.id
  LEFT JOIN month_call_logs   cl  ON cl.created_by = u.id
  LEFT JOIN month_chargebacks mcb ON mcb.agent_id  = u.id
  WHERE u.is_active = true;
END;
$$;

REVOKE ALL ON FUNCTION public.get_employee_monthly_stats(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_employee_monthly_stats(text) TO authenticated;


-- ── 4. get_attendance_vs_performance — replaces 2 wide client-side queries ────
CREATE OR REPLACE FUNCTION public.get_attendance_vs_performance(p_month text)
RETURNS TABLE (
  name            text,
  attendance_days bigint,
  approved_sales  bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start timestamptz;
  v_month_end   timestamptz;
  v_date_start  date;
  v_date_end    date;
BEGIN
  v_date_start  := (p_month || '-01')::date;
  v_date_end    := v_date_start + interval '1 month';
  v_month_start := v_date_start::timestamptz;
  v_month_end   := v_date_end::timestamptz;

  RETURN QUERY
  WITH
  att AS (
    SELECT a.user_id, COUNT(*) AS days
    FROM attendance a
    WHERE a.date >= v_date_start AND a.date < v_date_end
    GROUP BY a.user_id
  ),
  sal AS (
    SELECT s.agent_id, COUNT(*) AS sales
    FROM sales s
    WHERE s.created_at >= v_month_start
      AND s.created_at <  v_month_end
      AND s.status     != 'rejected'
      AND s.deleted_at IS  NULL
    GROUP BY s.agent_id
  ),
  all_uids AS (
    SELECT user_id AS uid FROM att
    UNION
    SELECT agent_id AS uid FROM sal
  )
  SELECT
    COALESCE(u.full_name, 'Unknown')  AS name,
    COALESCE(att.days,  0)            AS attendance_days,
    COALESCE(sal.sales, 0)            AS approved_sales
  FROM all_uids au
  LEFT JOIN att  ON att.user_id  = au.uid
  LEFT JOIN sal  ON sal.agent_id = au.uid
  LEFT JOIN users u ON u.id      = au.uid;
END;
$$;

REVOKE ALL ON FUNCTION public.get_attendance_vs_performance(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_attendance_vs_performance(text) TO authenticated;
