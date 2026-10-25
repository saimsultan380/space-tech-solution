-- Read-only range overloads for dashboard cards and reports.
-- Existing month functions are left in place. No table data is modified.

CREATE OR REPLACE FUNCTION public.get_dashboard_analytics_range(p_start date, p_end date)
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
  range_start timestamptz;
  range_end timestamptz;
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
  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start OR (p_end - p_start) > 366 THEN
    RAISE EXCEPTION 'Invalid analytics date range';
  END IF;

  range_start := p_start::timestamptz;
  range_end := (p_end + 1)::timestamptz;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'rejected'),
    COALESCE(SUM(charged_amount) FILTER (WHERE status <> 'rejected'), 0)
  INTO s_total, s_rejected, s_revenue
  FROM sales
  WHERE created_at >= range_start
    AND created_at < range_end
    AND deleted_at IS NULL;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE source = 'call_log')
  INTO c_total, cl_total
  FROM customers
  WHERE created_at >= range_start
    AND created_at < range_end
    AND deleted_at IS NULL;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'open')
  INTO cb_total, cb_open
  FROM chargebacks
  WHERE created_at >= range_start
    AND created_at < range_end;

  SELECT COUNT(*) INTO pa_total
  FROM processing_accounts
  WHERE created_at >= range_start
    AND created_at < range_end;

  SELECT
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'approved' AND today_date BETWEEN start_date AND end_date)
  INTO l_pending, l_today
  FROM leaves
  WHERE (created_at >= range_start AND created_at < range_end)
     OR (status = 'approved' AND today_date BETWEEN start_date AND end_date);

  RETURN QUERY SELECT
    s_total, s_rejected, s_revenue,
    c_total, cb_total, cb_open,
    cl_total, pa_total, l_pending, l_today;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sales_per_agent_stats_range(p_start date, p_end date)
RETURNS TABLE (agent_id uuid, name text, total bigint, approved bigint, revenue numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  range_start timestamptz;
  range_end timestamptz;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start OR (p_end - p_start) > 366 THEN
    RAISE EXCEPTION 'Invalid analytics date range';
  END IF;
  range_start := p_start::timestamptz;
  range_end := (p_end + 1)::timestamptz;

  RETURN QUERY
  SELECT
    s.agent_id,
    COALESCE(u.full_name, 'Unknown') AS name,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE s.status != 'rejected')::bigint AS approved,
    COALESCE(SUM(CASE WHEN s.status != 'rejected' THEN s.charged_amount ELSE 0 END), 0) AS revenue
  FROM sales s
  LEFT JOIN users u ON s.agent_id = u.id AND u.deleted_at IS NULL
  WHERE s.deleted_at IS NULL
    AND s.created_at >= range_start
    AND s.created_at < range_end
  GROUP BY s.agent_id, u.full_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sales_per_processor_stats_range(p_start date, p_end date)
RETURNS TABLE (processor_id uuid, name text, total bigint, approved bigint, rejected bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  range_start timestamptz;
  range_end timestamptz;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start OR (p_end - p_start) > 366 THEN
    RAISE EXCEPTION 'Invalid analytics date range';
  END IF;
  range_start := p_start::timestamptz;
  range_end := (p_end + 1)::timestamptz;

  RETURN QUERY
  SELECT
    s.processor_id,
    COALESCE(u.full_name, 'Unknown') AS name,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE s.status != 'rejected')::bigint AS approved,
    COUNT(*) FILTER (WHERE s.status = 'rejected')::bigint AS rejected
  FROM sales s
  LEFT JOIN users u ON s.processor_id = u.id AND u.deleted_at IS NULL
  WHERE s.processor_id IS NOT NULL
    AND s.deleted_at IS NULL
    AND s.created_at >= range_start
    AND s.created_at < range_end
  GROUP BY s.processor_id, u.full_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_chargebacks_per_employee_stats_range(p_start date, p_end date)
RETURNS TABLE (agent_id uuid, name text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  range_start timestamptz;
  range_end timestamptz;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start OR (p_end - p_start) > 366 THEN
    RAISE EXCEPTION 'Invalid analytics date range';
  END IF;
  range_start := p_start::timestamptz;
  range_end := (p_end + 1)::timestamptz;

  RETURN QUERY
  SELECT
    s.agent_id,
    COALESCE(u.full_name, 'Unknown') AS name,
    COUNT(*)::bigint AS count
  FROM chargebacks c
  JOIN sales s ON c.sale_id = s.id AND s.deleted_at IS NULL
  LEFT JOIN users u ON s.agent_id = u.id
  WHERE c.created_at >= range_start
    AND c.created_at < range_end
  GROUP BY s.agent_id, u.full_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_employee_monthly_stats_range(p_start date, p_end date)
RETURNS TABLE (
  id uuid,
  full_name text,
  role text,
  total_sales bigint,
  approved_sales bigint,
  rejected_sales bigint,
  revenue numeric,
  days_present bigint,
  total_hours numeric,
  call_log_responses bigint,
  chargebacks bigint,
  chargeback_ratio numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  range_start timestamptz;
  range_end timestamptz;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start OR (p_end - p_start) > 366 THEN
    RAISE EXCEPTION 'Invalid analytics date range';
  END IF;
  range_start := p_start::timestamptz;
  range_end := (p_end + 1)::timestamptz;

  RETURN QUERY
  WITH
  month_sales AS (
    SELECT
      s.agent_id,
      COUNT(*) AS total_sales,
      COUNT(*) FILTER (WHERE s.status != 'rejected') AS approved_sales,
      COUNT(*) FILTER (WHERE s.status = 'rejected') AS rejected_sales,
      COALESCE(SUM(s.charged_amount) FILTER (WHERE s.status != 'rejected'), 0) AS revenue
    FROM sales s
    WHERE s.created_at >= range_start
      AND s.created_at < range_end
      AND s.deleted_at IS NULL
    GROUP BY s.agent_id
  ),
  month_attendance AS (
    SELECT
      a.user_id,
      COUNT(*) AS days_present,
      COALESCE(SUM(
        CASE WHEN a.check_out IS NOT NULL
             THEN EXTRACT(EPOCH FROM (a.check_out::timestamptz - a.check_in::timestamptz)) / 3600.0
             ELSE 0 END
      ), 0) AS total_hours
    FROM attendance a
    WHERE a.date >= p_start
      AND a.date <= p_end
    GROUP BY a.user_id
  ),
  month_call_logs AS (
    SELECT c.created_by, COUNT(*) AS call_log_responses
    FROM customers c
    WHERE c.source = 'call_log'
      AND c.created_at >= range_start
      AND c.created_at < range_end
      AND c.deleted_at IS NULL
    GROUP BY c.created_by
  ),
  month_chargebacks AS (
    SELECT s.agent_id, COUNT(DISTINCT cb.id) AS chargeback_count
    FROM chargebacks cb
    JOIN sales s ON s.id = cb.sale_id
    WHERE cb.created_at >= range_start
      AND cb.created_at < range_end
    GROUP BY s.agent_id
  )
  SELECT
    u.id,
    u.full_name,
    u.role,
    COALESCE(ms.total_sales, 0) AS total_sales,
    COALESCE(ms.approved_sales, 0) AS approved_sales,
    COALESCE(ms.rejected_sales, 0) AS rejected_sales,
    COALESCE(ms.revenue, 0) AS revenue,
    COALESCE(ma.days_present, 0) AS days_present,
    ROUND(COALESCE(ma.total_hours, 0)::numeric, 1) AS total_hours,
    COALESCE(cl.call_log_responses, 0) AS call_log_responses,
    COALESCE(mcb.chargeback_count, 0) AS chargebacks,
    CASE
      WHEN COALESCE(ms.total_sales, 0) > 0
      THEN ROUND((COALESCE(mcb.chargeback_count, 0)::numeric / ms.total_sales::numeric) * 100, 1)
      ELSE 0
    END AS chargeback_ratio
  FROM users u
  LEFT JOIN month_sales ms ON ms.agent_id = u.id
  LEFT JOIN month_attendance ma ON ma.user_id = u.id
  LEFT JOIN month_call_logs cl ON cl.created_by = u.id
  LEFT JOIN month_chargebacks mcb ON mcb.agent_id = u.id
  WHERE u.is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_attendance_vs_performance_range(p_start date, p_end date)
RETURNS TABLE (
  name text,
  attendance_days bigint,
  approved_sales bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  range_start timestamptz;
  range_end timestamptz;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start OR (p_end - p_start) > 366 THEN
    RAISE EXCEPTION 'Invalid analytics date range';
  END IF;
  range_start := p_start::timestamptz;
  range_end := (p_end + 1)::timestamptz;

  RETURN QUERY
  WITH
  att AS (
    SELECT a.user_id, COUNT(*) AS days
    FROM attendance a
    WHERE a.date >= p_start AND a.date <= p_end
    GROUP BY a.user_id
  ),
  sal AS (
    SELECT s.agent_id, COUNT(*) AS sales
    FROM sales s
    WHERE s.created_at >= range_start
      AND s.created_at < range_end
      AND s.status != 'rejected'
      AND s.deleted_at IS NULL
    GROUP BY s.agent_id
  ),
  all_uids AS (
    SELECT user_id AS uid FROM att
    UNION
    SELECT agent_id AS uid FROM sal
  )
  SELECT
    COALESCE(u.full_name, 'Unknown') AS name,
    COALESCE(att.days, 0) AS attendance_days,
    COALESCE(sal.sales, 0) AS approved_sales
  FROM all_uids au
  LEFT JOIN att ON att.user_id = au.uid
  LEFT JOIN sal ON sal.agent_id = au.uid
  LEFT JOIN users u ON u.id = au.uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_revenue_over_time(period_type text, p_start date, p_end date)
RETURNS TABLE (
  date text,
  revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  range_start timestamptz;
  range_end timestamptz;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start OR (p_end - p_start) > 366 THEN
    RAISE EXCEPTION 'Invalid analytics date range';
  END IF;
  range_start := p_start::timestamptz;
  range_end := (p_end + 1)::timestamptz;

  IF period_type = 'week' THEN
    RETURN QUERY
    SELECT
      to_char(date_trunc('week', s.created_at), 'YYYY-MM-DD') AS d,
      COALESCE(sum(s.charged_amount), 0)
    FROM sales s
    WHERE s.status <> 'rejected'
      AND s.deleted_at IS NULL
      AND s.created_at >= range_start
      AND s.created_at < range_end
    GROUP BY d
    ORDER BY d ASC;
  ELSIF period_type = 'month' THEN
    RETURN QUERY
    SELECT
      to_char(s.created_at, 'YYYY-MM') AS d,
      COALESCE(sum(s.charged_amount), 0)
    FROM sales s
    WHERE s.status <> 'rejected'
      AND s.deleted_at IS NULL
      AND s.created_at >= range_start
      AND s.created_at < range_end
    GROUP BY d
    ORDER BY d ASC;
  ELSE
    RETURN QUERY
    SELECT
      to_char(s.created_at, 'YYYY-MM-DD') AS d,
      COALESCE(sum(s.charged_amount), 0)
    FROM sales s
    WHERE s.status <> 'rejected'
      AND s.deleted_at IS NULL
      AND s.created_at >= range_start
      AND s.created_at < range_end
    GROUP BY d
    ORDER BY d ASC;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_analytics_range(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sales_per_agent_stats_range(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sales_per_processor_stats_range(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_chargebacks_per_employee_stats_range(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_employee_monthly_stats_range(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_attendance_vs_performance_range(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_revenue_over_time(text, date, date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_dashboard_analytics_range(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_per_agent_stats_range(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_per_processor_stats_range(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chargebacks_per_employee_stats_range(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_monthly_stats_range(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendance_vs_performance_range(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_over_time(text, date, date) TO authenticated;
