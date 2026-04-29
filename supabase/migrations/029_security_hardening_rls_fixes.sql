-- Security hardening: fix overly permissive RLS policies.

-- 1. Fix chargeback_activity INSERT — require chargeback access, not just authentication.
--    Also restrict actor_id IS NULL to service_role only.
DROP POLICY IF EXISTS "Staff can add chargeback activity" ON public.chargeback_activity;
CREATE POLICY "Authorized users can add chargeback activity"
  ON public.chargeback_activity FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      (actor_id = auth.uid())
      OR (actor_id IS NULL AND (SELECT auth.role()) = 'service_role')
    )
    AND EXISTS (
      SELECT 1
      FROM public.chargebacks cb
      LEFT JOIN public.sales s ON s.id = cb.sale_id
      WHERE cb.id = chargeback_activity.chargeback_id
      AND cb.deleted_at IS NULL
      AND (
        public.get_user_role() IN ('super_admin', 'processor')
        OR cb.assigned_to = auth.uid()
        OR s.agent_id = auth.uid()
      )
    )
  );

-- 2. Fix chargebacks agent INSERT — agents can only create chargebacks for their own sales.
DROP POLICY IF EXISTS "Agents can create chargebacks" ON public.chargebacks;
CREATE POLICY "Agents can create chargebacks"
  ON public.chargebacks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() = 'sales_agent'
    AND EXISTS (
      SELECT 1 FROM public.sales
      WHERE sales.id = chargebacks.sale_id
      AND sales.agent_id = auth.uid()
      AND sales.deleted_at IS NULL
    )
  );

-- 3. Tighten notifications INSERT — only service_role or the user creating a notification for themselves.
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Service role or self can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    (SELECT auth.role()) = 'service_role'
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );
