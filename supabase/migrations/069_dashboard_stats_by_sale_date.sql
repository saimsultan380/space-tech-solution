-- Dashboard / reports sales cards: filter by sale_date, not created_at.
-- Customers, chargebacks, processing accounts, and leaves stay on created_at.

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
  month_start_d date;
  month_end_d date;
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
    month_start_d := (month_filter || '-01')::date;
    month_end_d := (month_start_d + interval '1 month')::date;
    month_start := month_start_d::timestamptz;
    month_end := month_end_d::timestamptz;
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'rejected'),
    COALESCE(SUM(charged_amount) FILTER (WHERE status <> 'rejected'), 0)
  INTO s_total, s_rejected, s_revenue
  FROM sales
  WHERE deleted_at IS NULL
    AND (
      month_start_d IS NULL
      OR (sale_date IS NOT NULL AND sale_date >= month_start_d AND sale_date < month_end_d)
    );

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE source = 'call_log')
  INTO c_total, cl_total
  FROM customers
  WHERE (month_start IS NULL OR (created_at >= month_start AND created_at < month_end))
    AND deleted_at IS NULL;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'open')
  INTO cb_total, cb_open
  FROM chargebacks
  WHERE (month_start IS NULL OR (created_at >= month_start AND created_at < month_end));

  SELECT COUNT(*) INTO pa_total
  FROM processing_accounts
  WHERE (month_start IS NULL OR (created_at >= month_start AND created_at < month_end));

  SELECT
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'approved' AND today_date BETWEEN start_date AND end_date)
  INTO l_pending, l_today
  FROM leaves
  WHERE (month_start IS NULL OR (created_at >= month_start AND created_at < month_end))
     OR (status = 'approved' AND today_date BETWEEN start_date AND end_date);

  RETURN QUERY SELECT
    s_total, s_rejected, s_revenue,
    c_total, cb_total, cb_open,
    cl_total, pa_total, l_pending, l_today;
END;
$$;

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
  WHERE deleted_at IS NULL
    AND sale_date IS NOT NULL
    AND sale_date >= p_start
    AND sale_date <= p_end;

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
