-- Hide full card numbers from sales agents, and store daily dialer logs.
-- Card values stay in their existing columns; only reads change.

CREATE OR REPLACE FUNCTION public.mask_payment_card_numbers(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  src text := COALESCE(input, '');
  i int := 1;
  n int := length(src);
  digits text;
  chunk text;
  ch text;
  out text := '';
BEGIN
  IF src = '' THEN
    RETURN '';
  END IF;

  WHILE i <= n LOOP
    IF substring(src, i, 1) ~ '[0-9]' THEN
      digits := '';
      chunk := '';
      WHILE i <= n AND substring(src, i, 1) ~ '[0-9 \t-]' LOOP
        ch := substring(src, i, 1);
        chunk := chunk || ch;
        IF ch ~ '[0-9]' THEN
          digits := digits || ch;
        END IF;
        i := i + 1;
        IF length(digits) > 19 THEN
          EXIT;
        END IF;
      END LOOP;
      WHILE length(chunk) > 0 AND substring(chunk, length(chunk), 1) !~ '[0-9]' LOOP
        chunk := left(chunk, -1);
        i := i - 1;
      END LOOP;
      IF length(digits) BETWEEN 13 AND 19
         AND substring(chunk, 1, 1) ~ '[0-9]'
         AND substring(chunk, length(chunk), 1) ~ '[0-9]' THEN
        out := out || '**** **** **** ' || right(digits, 4);
      ELSE
        out := out || chunk;
      END IF;
    ELSE
      out := out || substring(src, i, 1);
      i := i + 1;
    END IF;
  END LOOP;

  RETURN out;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_masked_card_numbers(submitted text, original text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result text := COALESCE(submitted, '');
  src text := COALESCE(original, '');
  i int := 1;
  n int := length(src);
  digits text;
  ch text;
  last4 text;
BEGIN
  WHILE i <= n LOOP
    IF substring(src, i, 1) ~ '[0-9]' THEN
      digits := '';
      WHILE i <= n AND substring(src, i, 1) ~ '[0-9 \t-]' AND length(digits) <= 19 LOOP
        ch := substring(src, i, 1);
        IF ch ~ '[0-9]' THEN
          digits := digits || ch;
        END IF;
        i := i + 1;
        IF length(digits) > 19 THEN
          EXIT;
        END IF;
      END LOOP;
      IF length(digits) BETWEEN 13 AND 19 THEN
        last4 := right(digits, 4);
        result := replace(result, '**** **** **** ' || last4, digits);
        result := regexp_replace(
          result,
          '(^|[^0-9])\*{4}' || last4 || '([^0-9]|$)',
          '\1' || digits || '\2',
          'g'
        );
      END IF;
    ELSE
      i := i + 1;
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_visible_sales_raw_data(p_sale_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.get_user_role();
  v_agent uuid;
  v_raw text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN '';
  END IF;

  SELECT s.agent_id, s.sales_raw_data
    INTO v_agent, v_raw
  FROM public.sales s
  WHERE s.id = p_sale_id
    AND s.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN '';
  END IF;

  IF v_role IS DISTINCT FROM 'super_admin'
     AND NOT (v_role = 'processor')
     AND NOT (v_role = 'sales_agent' AND v_agent = auth.uid()) THEN
    RETURN '';
  END IF;

  IF v_role = 'super_admin' THEN
    RETURN COALESCE(v_raw, '');
  END IF;

  RETURN public.mask_payment_card_numbers(COALESCE(v_raw, ''));
END;
$$;

CREATE OR REPLACE FUNCTION public.save_sales_raw_data(p_sale_id uuid, p_submitted text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.get_user_role();
  v_agent uuid;
  v_existing text;
  v_next text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT s.agent_id, s.sales_raw_data
    INTO v_agent, v_existing
  FROM public.sales s
  WHERE s.id = p_sale_id
    AND s.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;

  IF v_role = 'sales_agent' AND v_agent IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF v_role NOT IN ('super_admin', 'sales_agent') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF v_role = 'super_admin' THEN
    v_next := COALESCE(p_submitted, '');
  ELSE
    v_next := public.restore_masked_card_numbers(COALESCE(p_submitted, ''), COALESCE(v_existing, ''));
  END IF;

  UPDATE public.sales
  SET sales_raw_data = v_next,
      updated_at = now()
  WHERE id = p_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_visible_sales_raw_data(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_sales_raw_data(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_visible_sales_raw_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_sales_raw_data(uuid, text) TO authenticated;

REVOKE SELECT (sales_raw_data) ON TABLE public.sales FROM PUBLIC;
REVOKE SELECT (sales_raw_data) ON TABLE public.sales FROM anon;
REVOKE SELECT (sales_raw_data) ON TABLE public.sales FROM authenticated;

CREATE TABLE IF NOT EXISTS public.daily_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  log_date date NOT NULL,
  total_calls integer NOT NULL,
  total_sales integer NOT NULL,
  screenshot_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_call_logs_calls_nonnegative CHECK (total_calls >= 0),
  CONSTRAINT daily_call_logs_sales_nonnegative CHECK (total_sales >= 0),
  CONSTRAINT daily_call_logs_sales_lte_calls CHECK (total_sales <= total_calls),
  CONSTRAINT daily_call_logs_agent_date_key UNIQUE (agent_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_call_logs_log_date
  ON public.daily_call_logs (log_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_call_logs_agent_date
  ON public.daily_call_logs (agent_id, log_date DESC);

ALTER TABLE public.daily_call_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_call_logs_admin_all ON public.daily_call_logs;
CREATE POLICY daily_call_logs_admin_all
  ON public.daily_call_logs
  FOR ALL
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS daily_call_logs_agent_own ON public.daily_call_logs;
CREATE POLICY daily_call_logs_agent_own
  ON public.daily_call_logs
  FOR ALL
  USING (public.get_user_role() = 'sales_agent' AND agent_id = auth.uid())
  WITH CHECK (public.get_user_role() = 'sales_agent' AND agent_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_call_logs TO authenticated;

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
      OR u.full_name ILIKE '%' || p_search || '%'
      OR l.log_date::text ILIKE '%' || p_search || '%'
    );
$$;

REVOKE ALL ON FUNCTION public.daily_call_log_stats(date, date, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.daily_call_log_stats(date, date, uuid, text) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'call-log-screenshots',
  'call-log-screenshots',
  false,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS call_log_screenshots_select ON storage.objects;
CREATE POLICY call_log_screenshots_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'call-log-screenshots'
    AND (
      public.get_user_role() = 'super_admin'
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS call_log_screenshots_insert ON storage.objects;
CREATE POLICY call_log_screenshots_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'call-log-screenshots'
    AND (
      public.get_user_role() = 'super_admin'
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS call_log_screenshots_update ON storage.objects;
CREATE POLICY call_log_screenshots_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'call-log-screenshots'
    AND (
      public.get_user_role() = 'super_admin'
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  WITH CHECK (
    bucket_id = 'call-log-screenshots'
    AND (
      public.get_user_role() = 'super_admin'
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS call_log_screenshots_delete ON storage.objects;
CREATE POLICY call_log_screenshots_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'call-log-screenshots'
    AND (
      public.get_user_role() = 'super_admin'
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );
