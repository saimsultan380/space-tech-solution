-- ============================================
-- Security Audit Fixes - Migration 011
-- ============================================

-- 1. Fix Customers RLS Policy (Remove 'OR TRUE' loop)
DROP POLICY IF EXISTS "Agents can manage customers they created" ON public.customers;
CREATE POLICY "Agents can manage customers they created"
  ON public.customers FOR ALL
  USING (
    public.get_user_role() = 'sales_agent'
    AND created_by = auth.uid()
  );

-- 2. Fix Notes RLS Policy (Restrict visibility and inserts)
DROP POLICY IF EXISTS "Users can view relevant notes" ON public.notes;
DROP POLICY IF EXISTS "Super admins full access to notes" ON public.notes;
DROP POLICY IF EXISTS "Users can create notes" ON public.notes;

CREATE POLICY "Super admins full access to notes"
  ON public.notes FOR ALL
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Processors can view and create notes"
  ON public.notes FOR ALL
  USING (public.get_user_role() = 'processor');

CREATE POLICY "Agents can view and create notes for their sales/customers"
  ON public.notes FOR ALL
  USING (
    public.get_user_role() = 'sales_agent'
    AND (
      sale_id IN (SELECT id FROM public.sales WHERE agent_id = auth.uid() AND deleted_at IS NULL)
      OR customer_id IN (SELECT id FROM public.customers WHERE created_by = auth.uid() AND deleted_at IS NULL)
    )
  );

-- 3. Fix Payslips RLS Policy (Add Processor access)
DROP POLICY IF EXISTS "Super admins full access to payslips" ON public.payslips;
CREATE POLICY "Super admins and processors full access to payslips"
  ON public.payslips FOR ALL
  USING (public.get_user_role() IN ('super_admin', 'processor'));

-- 4. Fix Sales Update Status Policy (More precise)
DROP POLICY IF EXISTS "Processors can update sales status" ON public.sales;
CREATE POLICY "Processors can update sales status and processing notes"
  ON public.sales FOR UPDATE
  USING (public.get_user_role() = 'processor')
  WITH CHECK (public.get_user_role() = 'processor');

-- 5. Fix Attendance Policy (Restrict visibility to admins/processors)
DROP POLICY IF EXISTS "All authenticated users can view attendance" ON public.attendance;
CREATE POLICY "Super admins and processors can view all attendance"
  ON public.attendance FOR SELECT
  USING (public.get_user_role() IN ('super_admin', 'processor'));

CREATE POLICY "Users can view their own attendance"
  ON public.attendance FOR SELECT
  USING (user_id = auth.uid());
