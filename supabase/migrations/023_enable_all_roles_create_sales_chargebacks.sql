-- Allow processors to create sales records directly.
CREATE POLICY "Processors can insert sales"
  ON public.sales FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'processor'
    AND processor_id = auth.uid()
  );

-- Allow processors to insert payments for sales they process.
CREATE POLICY "Processors can insert payments for their sales"
  ON public.payments FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'processor'
    AND sale_id IN (SELECT id FROM public.sales WHERE processor_id = auth.uid())
  );

-- Allow sales agents to create chargebacks.
CREATE POLICY "Agents can create chargebacks"
  ON public.chargebacks FOR INSERT
  WITH CHECK (public.get_user_role() = 'sales_agent');
