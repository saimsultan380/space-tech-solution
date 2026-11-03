-- Page query for daily call logs. Same filters as daily_call_log_stats, so the
-- table and the stat cards stay in step. Row security still applies.

CREATE OR REPLACE FUNCTION public.daily_call_log_stats(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_agent uuid DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (total_calls bigint, total_sales bigint, days_logged bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(l.total_calls), 0)::bigint,
    COALESCE(SUM(l.total_sales), 0)::bigint,
    COUNT(*)::bigint
  FROM public.daily_call_logs l
  LEFT JOIN public.users u ON u.id = l.agent_id
  WHERE (p_from IS NULL OR l.log_date >= p_from)
    AND (p_to IS NULL OR l.log_date <= p_to)
    AND (p_agent IS NULL OR l.agent_id = p_agent)
    AND (
      p_search IS NULL
      OR btrim(p_search) = ''
      OR COALESCE(u.full_name, '') ILIKE '%' || p_search || '%'
      OR l.log_date::text ILIKE '%' || p_search || '%'
    );
$$;

CREATE OR REPLACE FUNCTION public.daily_call_logs_page(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_agent uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  agent_id uuid,
  agent_name text,
  log_date date,
  total_calls integer,
  total_sales integer,
  screenshot_path text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    l.id,
    l.agent_id,
    u.full_name,
    l.log_date,
    l.total_calls,
    l.total_sales,
    l.screenshot_path
  FROM public.daily_call_logs l
  LEFT JOIN public.users u ON u.id = l.agent_id
  WHERE (p_from IS NULL OR l.log_date >= p_from)
    AND (p_to IS NULL OR l.log_date <= p_to)
    AND (p_agent IS NULL OR l.agent_id = p_agent)
    AND (
      p_search IS NULL
      OR btrim(p_search) = ''
      OR COALESCE(u.full_name, '') ILIKE '%' || p_search || '%'
      OR l.log_date::text ILIKE '%' || p_search || '%'
    )
  ORDER BY l.log_date DESC, l.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 24), 0)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.daily_call_logs_page(date, date, uuid, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.daily_call_logs_page(date, date, uuid, text, integer, integer) TO authenticated;
