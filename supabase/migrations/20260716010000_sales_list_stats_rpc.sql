-- Sales list stats: aggregate in Postgres instead of downloading all matching rows.
-- Used by src/lib/queries/sales.ts getSales().

CREATE OR REPLACE FUNCTION public.get_filtered_sales_stats(
  p_sale_type text DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL,
  p_from_date timestamptz DEFAULT NULL,
  p_to_date timestamptz DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result json;
  safe_search text;
  like_pat text;
  numeric_val numeric;
  has_numeric boolean := false;
BEGIN
  IF p_search IS NOT NULL AND length(trim(p_search)) > 0 THEN
    safe_search := trim(p_search);
    like_pat := '%' || replace(replace(replace(safe_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    BEGIN
      numeric_val := NULLIF(regexp_replace(safe_search, '[^0-9.\-]', '', 'g'), '')::numeric;
      has_numeric := numeric_val IS NOT NULL
        AND length(regexp_replace(safe_search, '[^0-9.\-]', '', 'g')) > 0;
    EXCEPTION WHEN others THEN
      has_numeric := false;
      numeric_val := NULL;
    END;
  END IF;

  SELECT json_build_object(
    'total_records', COUNT(*)::int,
    'total_amount', COALESCE(SUM(s.amount), 0)::numeric,
    'gross_charged_amount', COALESCE(SUM(s.charged_amount), 0)::numeric,
    'chargeback_impacted_amount', COALESCE(SUM(
      CASE WHEN EXISTS (
        SELECT 1 FROM chargebacks c WHERE c.sale_id = s.id
      ) THEN s.charged_amount ELSE 0 END
    ), 0)::numeric,
    'utility_count', COUNT(*) FILTER (WHERE s.sale_type = 'utility')::int,
    'insurance_count', COUNT(*) FILTER (WHERE s.sale_type = 'insurance')::int
  )
  INTO result
  FROM sales s
  WHERE s.deleted_at IS NULL
    AND (p_sale_type IS NULL OR p_sale_type = 'all' OR s.sale_type = p_sale_type)
    AND (p_agent_id IS NULL OR s.agent_id = p_agent_id)
    AND (p_from_date IS NULL OR s.created_at >= p_from_date)
    AND (p_to_date IS NULL OR s.created_at <= p_to_date)
    AND (
      like_pat IS NULL
      OR s.customer_name ILIKE like_pat ESCAPE '\'
      OR s.customer_email ILIKE like_pat ESCAPE '\'
      OR s.customer_phone ILIKE like_pat ESCAPE '\'
      OR s.company_name ILIKE like_pat ESCAPE '\'
      OR s.utility_company_service_number ILIKE like_pat ESCAPE '\'
      OR s.policy_holder_name ILIKE like_pat ESCAPE '\'
      OR s.account_holder_name ILIKE like_pat ESCAPE '\'
      OR s.card_last_four ILIKE like_pat ESCAPE '\'
      OR (has_numeric AND (s.amount = numeric_val OR s.charged_amount = numeric_val))
    );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_filtered_sales_stats(text, uuid, timestamptz, timestamptz, text)
  TO authenticated;
