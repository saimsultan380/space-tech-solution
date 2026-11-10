-- Merchant role and one charge request per new card sale.
-- Does not update existing users, sales, or payments.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role = ANY (ARRAY['super_admin', 'sales_agent', 'processor', 'merchant']));

CREATE TABLE IF NOT EXISTS public.sale_charge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL UNIQUE REFERENCES public.sales(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.users(id),
  merchant_user_id uuid NOT NULL REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending', 'viewed', 'charging', 'approved', 'declined'])),
  viewed_at timestamptz,
  charging_at timestamptz,
  decided_at timestamptz,
  decline_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_charge_requests_merchant_status
  ON public.sale_charge_requests (merchant_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sale_charge_requests_agent
  ON public.sale_charge_requests (agent_id, created_at DESC);

ALTER TABLE public.sale_charge_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sale_charge_requests_admin_all ON public.sale_charge_requests;
CREATE POLICY sale_charge_requests_admin_all
  ON public.sale_charge_requests
  FOR ALL
  TO authenticated
  USING ((SELECT public.get_user_role()) = 'super_admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'super_admin');

DROP POLICY IF EXISTS sale_charge_requests_agent_select ON public.sale_charge_requests;
CREATE POLICY sale_charge_requests_agent_select
  ON public.sale_charge_requests
  FOR SELECT
  TO authenticated
  USING (
    agent_id = (SELECT auth.uid())
    AND (SELECT public.get_user_role()) IN ('sales_agent', 'processor')
  );

DROP POLICY IF EXISTS sale_charge_requests_staff_insert ON public.sale_charge_requests;
CREATE POLICY sale_charge_requests_staff_insert
  ON public.sale_charge_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.get_user_role()) = 'super_admin'
    OR agent_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS sale_charge_requests_merchant_select ON public.sale_charge_requests;
CREATE POLICY sale_charge_requests_merchant_select
  ON public.sale_charge_requests
  FOR SELECT
  TO authenticated
  USING (
    merchant_user_id = (SELECT auth.uid())
    AND (SELECT public.get_user_role()) = 'merchant'
  );

-- Status changes go through transition_sale_charge_request so a second
-- click cannot charge the same card again. No direct UPDATE grant.

REVOKE ALL ON public.sale_charge_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.sale_charge_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_sale_charge_request(
  p_id uuid,
  p_next text,
  p_reason text DEFAULT NULL
)
RETURNS public.sale_charge_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.sale_charge_requests;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_next NOT IN ('viewed', 'charging', 'approved', 'declined') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT * INTO v_row
  FROM public.sale_charge_requests
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF v_row.merchant_user_id <> v_uid AND public.get_user_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Not assigned to you';
  END IF;
  -- Super admin may view, but only the assigned merchant can charge.
  IF p_next <> 'viewed' AND v_row.merchant_user_id <> v_uid THEN
    RAISE EXCEPTION 'Only the assigned merchant can charge this card';
  END IF;

  IF p_next = 'viewed' THEN
    IF v_row.status <> 'pending' THEN
      RETURN v_row;
    END IF;
    UPDATE public.sale_charge_requests
      SET status = 'viewed', viewed_at = now(), updated_at = now()
      WHERE id = p_id AND status = 'pending'
      RETURNING * INTO v_row;
  ELSIF p_next = 'charging' THEN
    IF v_row.status NOT IN ('pending', 'viewed') THEN
      RAISE EXCEPTION 'Charge already started';
    END IF;
    UPDATE public.sale_charge_requests
      SET status = 'charging',
          charging_at = now(),
          viewed_at = COALESCE(viewed_at, now()),
          updated_at = now()
      WHERE id = p_id AND status IN ('pending', 'viewed')
      RETURNING * INTO v_row;
  ELSIF p_next = 'approved' THEN
    IF v_row.status <> 'charging' THEN
      RAISE EXCEPTION 'Start the charge before approving';
    END IF;
    UPDATE public.sale_charge_requests
      SET status = 'approved', decided_at = now(), updated_at = now()
      WHERE id = p_id AND status = 'charging'
      RETURNING * INTO v_row;
  ELSIF p_next = 'declined' THEN
    IF v_row.status <> 'charging' THEN
      RAISE EXCEPTION 'Start the charge before declining';
    END IF;
    IF COALESCE(trim(p_reason), '') = '' THEN
      RAISE EXCEPTION 'Decline reason is required';
    END IF;
    UPDATE public.sale_charge_requests
      SET status = 'declined',
          decided_at = now(),
          decline_reason = trim(p_reason),
          updated_at = now()
      WHERE id = p_id AND status = 'charging'
      RETURNING * INTO v_row;
  END IF;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'This request was already updated';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_sale_charge_request(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_sale_charge_request(uuid, text, text) TO authenticated;
