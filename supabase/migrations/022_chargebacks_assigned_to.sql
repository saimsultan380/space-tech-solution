-- Who is responsible for handling this chargeback (receives notification + sees it on Chargebacks page).
ALTER TABLE public.chargebacks
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chargebacks_assigned_to ON public.chargebacks(assigned_to);

COMMENT ON COLUMN public.chargebacks.assigned_to IS 'User assigned to handle this chargeback; receives in-app notification.';

-- Allow sales agents to see chargebacks assigned to them (not only their own sales).
DROP POLICY IF EXISTS "Agents can view chargebacks for their sales" ON public.chargebacks;

CREATE POLICY "Agents can view chargebacks for their sales or assigned"
  ON public.chargebacks FOR SELECT
  USING (
    public.get_user_role() = 'sales_agent'
    AND (
      sale_id IN (SELECT id FROM public.sales WHERE agent_id = auth.uid())
      OR assigned_to = auth.uid()
    )
  );
