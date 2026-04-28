-- Revenue over time RPC to group revenue by period in SQL.

CREATE OR REPLACE FUNCTION public.get_revenue_over_time(period_type text DEFAULT 'day')
RETURNS TABLE (
  date text,
  revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF period_type = 'day' THEN
    RETURN QUERY
    SELECT
      to_char(created_at, 'YYYY-MM-DD') as d,
      sum(charged_amount)
    FROM sales
    WHERE status <> 'rejected'
    GROUP BY d
    ORDER BY d ASC;
  ELSIF period_type = 'week' THEN
    RETURN QUERY
    SELECT
      to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as d,
      sum(charged_amount)
    FROM sales
    WHERE status <> 'rejected'
    GROUP BY d
    ORDER BY d ASC;
  ELSIF period_type = 'month' THEN
    RETURN QUERY
    SELECT
      to_char(created_at, 'YYYY-MM') as d,
      sum(charged_amount)
    FROM sales
    WHERE status <> 'rejected'
    GROUP BY d
    ORDER BY d ASC;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_revenue_over_time(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_revenue_over_time(text) TO authenticated;
