-- Merchant remarks, and a charge can wait for any active merchant account.
-- Existing sales and payments are not rewritten.

ALTER TABLE public.sale_charge_requests
  ADD COLUMN IF NOT EXISTS remarks text;

ALTER TABLE public.sale_charge_requests
  ALTER COLUMN merchant_user_id DROP NOT NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS charge_card boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS sale_charge_requests_merchant_select ON public.sale_charge_requests;
CREATE POLICY sale_charge_requests_merchant_select
  ON public.sale_charge_requests
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.get_user_role()) = 'merchant'
    AND (
      merchant_user_id IS NULL
      OR merchant_user_id = (SELECT auth.uid())
    )
  );

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
  v_remarks text := NULLIF(trim(COALESCE(p_reason, '')), '');
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
  IF v_row.merchant_user_id IS NOT NULL
     AND v_row.merchant_user_id <> v_uid
     AND public.get_user_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Not assigned to you';
  END IF;
  IF p_next <> 'viewed' AND v_row.merchant_user_id IS NOT NULL AND v_row.merchant_user_id <> v_uid THEN
    RAISE EXCEPTION 'Only the assigned merchant can charge this card';
  END IF;
  IF p_next <> 'viewed' AND public.get_user_role() <> 'merchant' THEN
    RAISE EXCEPTION 'Only the assigned merchant can charge this card';
  END IF;

  IF p_next = 'viewed' THEN
    IF v_row.status <> 'pending' THEN
      RETURN v_row;
    END IF;
    UPDATE public.sale_charge_requests
      SET status = 'viewed',
          viewed_at = now(),
          merchant_user_id = CASE
            WHEN merchant_user_id IS NULL AND public.get_user_role() = 'merchant' THEN v_uid
            ELSE merchant_user_id
          END,
          updated_at = now()
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
          merchant_user_id = CASE
            WHEN merchant_user_id IS NULL THEN v_uid
            ELSE merchant_user_id
          END,
          updated_at = now()
      WHERE id = p_id AND status IN ('pending', 'viewed')
      RETURNING * INTO v_row;
  ELSIF p_next = 'approved' THEN
    IF v_row.status <> 'charging' THEN
      RAISE EXCEPTION 'Start the charge before approving';
    END IF;
    UPDATE public.sale_charge_requests
      SET status = 'approved',
          decided_at = now(),
          remarks = v_remarks,
          updated_at = now()
      WHERE id = p_id AND status = 'charging'
      RETURNING * INTO v_row;
  ELSIF p_next = 'declined' THEN
    IF v_row.status <> 'charging' THEN
      RAISE EXCEPTION 'Start the charge before declining';
    END IF;
    IF v_remarks IS NULL THEN
      RAISE EXCEPTION 'Decline reason is required';
    END IF;
    UPDATE public.sale_charge_requests
      SET status = 'declined',
          decided_at = now(),
          decline_reason = v_remarks,
          remarks = v_remarks,
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
