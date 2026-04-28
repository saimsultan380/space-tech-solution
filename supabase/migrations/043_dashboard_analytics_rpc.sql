-- Dashboard analytics RPC to fetch all stats in a single call.
-- Performs aggregations in SQL to avoid fetching raw rows.

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
BEGIN
  IF month_filter IS NOT NULL AND month_filter <> '' THEN
    month_start := (month_filter || '-01')::timestamptz;
    month_end := (month_start + interval '1 month');
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM sales s WHERE (month_start IS NULL OR (s.created_at >= month_start AND s.created_at < month_end))),
    (SELECT count(*) FROM sales s WHERE s.status = 'rejected' AND (month_start IS NULL OR (s.created_at >= month_start AND s.created_at < month_end))),
    (SELECT COALESCE(sum(charged_amount), 0) FROM sales s WHERE s.status <> 'rejected' AND (month_start IS NULL OR (s.created_at >= month_start AND s.created_at < month_end))),
    (SELECT count(*) FROM customers c WHERE (month_start IS NULL OR (c.created_at >= month_start AND c.created_at < month_end))),
    (SELECT count(*) FROM chargebacks cb WHERE (month_start IS NULL OR (cb.created_at >= month_start AND cb.created_at < month_end))),
    (SELECT count(*) FROM chargebacks cb WHERE cb.status = 'open' AND (month_start IS NULL OR (cb.created_at >= month_start AND cb.created_at < month_end))),
    (SELECT count(*) FROM customers c WHERE c.source = 'call_log' AND (month_start IS NULL OR (c.created_at >= month_start AND c.created_at < month_end))),
    (SELECT count(*) FROM processing_accounts pa WHERE (month_start IS NULL OR (pa.created_at >= month_start AND pa.created_at < month_end))),
    (SELECT count(*) FROM leaves l WHERE l.status = 'pending' AND (month_start IS NULL OR (l.created_at >= month_start AND l.created_at < month_end))),
    (SELECT count(*) FROM leaves l WHERE l.status = 'approved' AND today_date BETWEEN l.start_date AND l.end_date)
  ;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_analytics(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_analytics(text) TO authenticated;
