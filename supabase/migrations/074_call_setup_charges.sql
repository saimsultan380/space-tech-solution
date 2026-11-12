-- Dated call setup charges. A sale whose date falls in a period picks up that
-- amount. Existing sales rows are not updated; reports sum the charge.

CREATE TABLE IF NOT EXISTS public.call_setup_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  amount numeric(12, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT call_setup_charges_dates CHECK (ends_on >= starts_on),
  CONSTRAINT call_setup_charges_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_call_setup_charges_dates
  ON public.call_setup_charges (starts_on, ends_on);

CREATE OR REPLACE FUNCTION public.call_setup_charges_reject_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.call_setup_charges existing
    WHERE existing.id IS DISTINCT FROM NEW.id
      AND daterange(existing.starts_on, existing.ends_on, '[]')
          && daterange(NEW.starts_on, NEW.ends_on, '[]')
  ) THEN
    RAISE EXCEPTION 'Call setup charge dates overlap an existing period';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS call_setup_charges_reject_overlap ON public.call_setup_charges;
CREATE TRIGGER call_setup_charges_reject_overlap
  BEFORE INSERT OR UPDATE ON public.call_setup_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.call_setup_charges_reject_overlap();

ALTER TABLE public.call_setup_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS call_setup_charges_read ON public.call_setup_charges;
CREATE POLICY call_setup_charges_read
  ON public.call_setup_charges
  FOR SELECT
  TO authenticated
  USING ((SELECT public.get_user_role()) IS NOT NULL);

DROP POLICY IF EXISTS call_setup_charges_write ON public.call_setup_charges;
CREATE POLICY call_setup_charges_write
  ON public.call_setup_charges
  FOR ALL
  TO authenticated
  USING ((SELECT public.get_user_role()) = 'super_admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'super_admin');

REVOKE ALL ON public.call_setup_charges FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_setup_charges TO authenticated;

DROP FUNCTION IF EXISTS public.get_employee_monthly_stats(text);
DROP FUNCTION IF EXISTS public.get_employee_monthly_stats_range(date, date);

CREATE FUNCTION public.get_employee_monthly_stats(p_month text)
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
  call_setup_charges numeric,
  chargebacks bigint,
  chargeback_amount numeric,
  call_to_sale_conversion numeric,
  chargeback_ratio numeric
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
      COUNT(*) AS total_sales,
      COUNT(*) FILTER (WHERE s.status != 'rejected') AS approved_sales,
      COUNT(*) FILTER (WHERE s.status = 'rejected') AS rejected_sales,
      COALESCE(SUM(s.charged_amount), 0) AS revenue
    FROM sales s
    WHERE s.created_at >= v_month_start
      AND s.created_at < v_month_end
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
    WHERE a.date >= v_date_start
      AND a.date < v_date_end
    GROUP BY a.user_id
  ),
  month_call_logs AS (
    SELECT c.created_by, COUNT(*) AS call_log_responses
    FROM customers c
    WHERE c.source = 'call_log'
      AND c.created_at >= v_month_start
      AND c.created_at < v_month_end
      AND c.deleted_at IS NULL
    GROUP BY c.created_by
  ),
  month_call_setup AS (
    SELECT
      s.agent_id,
      COALESCE(SUM(charge.amount), 0) AS call_setup_charges
    FROM sales s
    JOIN call_setup_charges charge
      ON COALESCE(s.sale_date, (s.created_at AT TIME ZONE 'America/New_York')::date)
         BETWEEN charge.starts_on AND charge.ends_on
    WHERE s.created_at >= v_month_start
      AND s.created_at < v_month_end
      AND s.deleted_at IS NULL
    GROUP BY s.agent_id
  ),
  month_chargebacks AS (
    SELECT
      s.agent_id,
      COUNT(*) AS chargeback_count,
      COALESCE(SUM(s.charged_amount), 0) AS chargeback_amount
    FROM sales s
    WHERE s.deleted_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM chargebacks cb
        WHERE cb.sale_id = s.id
          AND cb.created_at >= v_month_start
          AND cb.created_at < v_month_end
      )
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
    COALESCE(setup.call_setup_charges, 0) AS call_setup_charges,
    COALESCE(mcb.chargeback_count, 0) AS chargebacks,
    COALESCE(mcb.chargeback_amount, 0) AS chargeback_amount,
    CASE
      WHEN COALESCE(cl.call_log_responses, 0) > 0
      THEN ROUND((COALESCE(ms.total_sales, 0)::numeric / cl.call_log_responses::numeric) * 100, 1)
      ELSE 0
    END AS call_to_sale_conversion,
    CASE
      WHEN COALESCE(ms.total_sales, 0) > 0
      THEN ROUND((COALESCE(mcb.chargeback_count, 0)::numeric / ms.total_sales::numeric) * 100, 1)
      ELSE 0
    END AS chargeback_ratio
  FROM users u
  LEFT JOIN month_sales ms ON ms.agent_id = u.id
  LEFT JOIN month_attendance ma ON ma.user_id = u.id
  LEFT JOIN month_call_logs cl ON cl.created_by = u.id
  LEFT JOIN month_call_setup setup ON setup.agent_id = u.id
  LEFT JOIN month_chargebacks mcb ON mcb.agent_id = u.id
  WHERE u.is_active = true;
END;
$$;

CREATE FUNCTION public.get_employee_monthly_stats_range(p_start date, p_end date)
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
  call_setup_charges numeric,
  chargebacks bigint,
  chargeback_amount numeric,
  call_to_sale_conversion numeric,
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
      COALESCE(SUM(s.charged_amount), 0) AS revenue
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
  month_call_setup AS (
    SELECT
      s.agent_id,
      COALESCE(SUM(charge.amount), 0) AS call_setup_charges
    FROM sales s
    JOIN call_setup_charges charge
      ON COALESCE(s.sale_date, (s.created_at AT TIME ZONE 'America/New_York')::date)
         BETWEEN charge.starts_on AND charge.ends_on
    WHERE s.created_at >= range_start
      AND s.created_at < range_end
      AND s.deleted_at IS NULL
    GROUP BY s.agent_id
  ),
  month_chargebacks AS (
    SELECT
      s.agent_id,
      COUNT(*) AS chargeback_count,
      COALESCE(SUM(s.charged_amount), 0) AS chargeback_amount
    FROM sales s
    WHERE s.deleted_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM chargebacks cb
        WHERE cb.sale_id = s.id
          AND cb.created_at >= range_start
          AND cb.created_at < range_end
      )
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
    COALESCE(setup.call_setup_charges, 0) AS call_setup_charges,
    COALESCE(mcb.chargeback_count, 0) AS chargebacks,
    COALESCE(mcb.chargeback_amount, 0) AS chargeback_amount,
    CASE
      WHEN COALESCE(cl.call_log_responses, 0) > 0
      THEN ROUND((COALESCE(ms.total_sales, 0)::numeric / cl.call_log_responses::numeric) * 100, 1)
      ELSE 0
    END AS call_to_sale_conversion,
    CASE
      WHEN COALESCE(ms.total_sales, 0) > 0
      THEN ROUND((COALESCE(mcb.chargeback_count, 0)::numeric / ms.total_sales::numeric) * 100, 1)
      ELSE 0
    END AS chargeback_ratio
  FROM users u
  LEFT JOIN month_sales ms ON ms.agent_id = u.id
  LEFT JOIN month_attendance ma ON ma.user_id = u.id
  LEFT JOIN month_call_logs cl ON cl.created_by = u.id
  LEFT JOIN month_call_setup setup ON setup.agent_id = u.id
  LEFT JOIN month_chargebacks mcb ON mcb.agent_id = u.id
  WHERE u.is_active = true;
END;
$$;

REVOKE ALL ON FUNCTION public.get_employee_monthly_stats(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_employee_monthly_stats_range(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_employee_monthly_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_monthly_stats_range(date, date) TO authenticated;
