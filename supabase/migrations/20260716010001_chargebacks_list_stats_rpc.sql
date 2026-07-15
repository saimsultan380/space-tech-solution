-- Chargebacks list stats: aggregate in Postgres instead of downloading all matching rows.
-- Used by src/lib/actions/chargebacks.ts getChargebacks().

CREATE OR REPLACE FUNCTION public.get_filtered_chargeback_stats(
  p_status text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_from_date date DEFAULT NULL,
  p_to_date date DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_sale_ids uuid[] DEFAULT NULL,
  p_assignee_ids uuid[] DEFAULT NULL,
  p_amount_sale_ids uuid[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result json;
  like_pat text;
  statuses text[];
  month_start date;
BEGIN
  IF p_search IS NOT NULL AND length(trim(p_search)) > 0 THEN
    like_pat := '%' || replace(replace(replace(trim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  IF p_status IS NOT NULL AND p_status <> '' AND p_status <> 'all' THEN
    statuses := string_to_array(p_status, ',');
    statuses := ARRAY(SELECT trim(s) FROM unnest(statuses) AS s WHERE length(trim(s)) > 0);
  END IF;

  month_start := date_trunc('month', CURRENT_DATE)::date - INTERVAL '5 months';

  WITH filtered AS (
    SELECT
      c.id,
      c.status,
      c.assigned_to,
      c.reason,
      c.created_at,
      c.updated_at,
      COALESCE(s.charged_amount, 0)::numeric AS charged_amount
    FROM chargebacks c
    LEFT JOIN sales s ON s.id = c.sale_id
    WHERE
      (statuses IS NULL OR c.status = ANY (statuses))
      AND (p_assigned_to IS NULL OR c.assigned_to = p_assigned_to)
      AND (p_from_date IS NULL OR c.date >= p_from_date)
      AND (p_to_date IS NULL OR c.date <= p_to_date)
      AND (
        p_amount_sale_ids IS NULL
        OR cardinality(p_amount_sale_ids) = 0
        OR c.sale_id = ANY (p_amount_sale_ids)
      )
      AND (
        like_pat IS NULL
        OR c.reason ILIKE like_pat ESCAPE '\'
        OR c.status::text ILIKE like_pat ESCAPE '\'
        OR (
          p_sale_ids IS NOT NULL
          AND cardinality(p_sale_ids) > 0
          AND c.sale_id = ANY (p_sale_ids)
        )
        OR (
          p_assignee_ids IS NOT NULL
          AND cardinality(p_assignee_ids) > 0
          AND c.assigned_to = ANY (p_assignee_ids)
        )
      )
  ),
  aggregates AS (
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
      COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_count,
      COUNT(*) FILTER (WHERE status = 'disputed')::int AS disputed_count,
      COUNT(*) FILTER (WHERE assigned_to IS NOT NULL)::int AS assigned_count,
      COALESCE(SUM(charged_amount), 0)::numeric AS impacted_amount,
      COALESCE(
        AVG(
          CASE
            WHEN status = 'resolved'
              AND created_at IS NOT NULL
              AND updated_at IS NOT NULL
              AND updated_at >= created_at
            THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400.0
            ELSE NULL
          END
        ),
        0
      )::numeric AS avg_resolution_days
    FROM filtered
  ),
  by_month AS (
    SELECT
      to_char(d.month_start, 'Mon') AS month_label,
      COALESCE(COUNT(f.id), 0)::int AS cnt
    FROM generate_series(month_start, date_trunc('month', CURRENT_DATE)::date, INTERVAL '1 month') AS d(month_start)
    LEFT JOIN filtered f
      ON f.created_at >= d.month_start
     AND f.created_at < (d.month_start + INTERVAL '1 month')
    GROUP BY d.month_start
    ORDER BY d.month_start
  ),
  top_reasons AS (
    SELECT
      trim(reason) AS reason,
      COUNT(*)::int AS cnt
    FROM filtered
    WHERE reason IS NOT NULL AND length(trim(reason)) > 0
    GROUP BY trim(reason)
    ORDER BY cnt DESC
    LIMIT 5
  )
  SELECT json_build_object(
    'total', a.total,
    'open', a.open_count,
    'resolved', a.resolved_count,
    'disputed', a.disputed_count,
    'assigned', a.assigned_count,
    'impacted_amount', a.impacted_amount,
    'avg_resolution_days', ROUND(a.avg_resolution_days::numeric, 2),
    'resolution_rate', CASE WHEN a.total > 0 THEN ROUND((a.resolved_count::numeric / a.total) * 100, 2) ELSE 0 END,
    'dispute_success_rate', CASE
      WHEN (a.resolved_count + a.disputed_count) > 0
      THEN ROUND((a.resolved_count::numeric / (a.resolved_count + a.disputed_count)) * 100, 2)
      ELSE 0
    END,
    'by_month', COALESCE((
      SELECT json_agg(json_build_object('month', month_label, 'count', cnt) ORDER BY ord)
      FROM (
        SELECT month_label, cnt, row_number() OVER () AS ord FROM by_month
      ) m
    ), '[]'::json),
    'top_reasons', COALESCE((
      SELECT json_agg(json_build_object('reason', reason, 'count', cnt))
      FROM top_reasons
    ), '[]'::json)
  )
  INTO result
  FROM aggregates a;

  RETURN COALESCE(result, json_build_object(
    'total', 0,
    'open', 0,
    'resolved', 0,
    'disputed', 0,
    'assigned', 0,
    'impacted_amount', 0,
    'avg_resolution_days', 0,
    'resolution_rate', 0,
    'dispute_success_rate', 0,
    'by_month', '[]'::json,
    'top_reasons', '[]'::json
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_filtered_chargeback_stats(
  text, uuid, date, date, text, uuid[], uuid[], uuid[]
) TO authenticated;
