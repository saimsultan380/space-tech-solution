-- ============================================
-- CRM Billing System - Initial Database Schema
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Users table (linked to auth.users)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'sales_agent', 'processor')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);

-- ============================================
-- 2. Customers table
-- ============================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  dob DATE,
  ssn_encrypted TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_name ON public.customers(name);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_created_by ON public.customers(created_by);

-- ============================================
-- 3. Sales table
-- ============================================
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_type TEXT NOT NULL CHECK (sale_type IN ('utility', 'insurance')),
  subtype TEXT NOT NULL CHECK (subtype IN ('new', 'bill', 'premium')),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.users(id),
  processor_id UUID REFERENCES public.users(id),
  company_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  charged_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  billed_month TEXT NOT NULL,
  next_billing_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  sales_notes TEXT NOT NULL DEFAULT '',
  processing_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_customer ON public.sales(customer_id);
CREATE INDEX idx_sales_agent ON public.sales(agent_id);
CREATE INDEX idx_sales_processor ON public.sales(processor_id);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sales_type ON public.sales(sale_type);
CREATE INDEX idx_sales_created ON public.sales(created_at);

-- ============================================
-- 4. Payments table
-- ============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('card', 'bank')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  card_last_four TEXT,
  bank_name TEXT,
  encrypted_details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_sale ON public.payments(sale_id);
CREATE INDEX idx_payments_customer ON public.payments(customer_id);

-- ============================================
-- 5. Attendance table
-- ============================================
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_user ON public.attendance(user_id);
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE UNIQUE INDEX idx_attendance_user_date ON public.attendance(user_id, date);

-- ============================================
-- 6. Chargebacks table
-- ============================================
CREATE TABLE public.chargebacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'disputed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chargebacks_sale ON public.chargebacks(sale_id);
CREATE INDEX idx_chargebacks_status ON public.chargebacks(status);

-- ============================================
-- 7. Notes table (lead history / notes per sale or customer)
-- ============================================
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_sale ON public.notes(sale_id);
CREATE INDEX idx_notes_customer ON public.notes(customer_id);
CREATE INDEX idx_notes_user ON public.notes(user_id);

-- ============================================
-- Auto-update updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_chargebacks_updated_at BEFORE UPDATE ON public.chargebacks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chargebacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- USERS policies ----
CREATE POLICY "Super admins can do everything on users"
  ON public.users FOR ALL
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Users can read their own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Agents and processors can view all user names"
  ON public.users FOR SELECT
  USING (public.get_user_role() IN ('sales_agent', 'processor'));

-- ---- CUSTOMERS policies ----
CREATE POLICY "Super admins full access to customers"
  ON public.customers FOR ALL
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Agents can manage customers they created"
  ON public.customers FOR ALL
  USING (
    public.get_user_role() = 'sales_agent'
    AND (created_by = auth.uid() OR TRUE)
  );

CREATE POLICY "Processors can view customers"
  ON public.customers FOR SELECT
  USING (public.get_user_role() = 'processor');

-- ---- SALES policies ----
CREATE POLICY "Super admins full access to sales"
  ON public.sales FOR ALL
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Agents can manage their own sales"
  ON public.sales FOR ALL
  USING (
    public.get_user_role() = 'sales_agent'
    AND agent_id = auth.uid()
  );

CREATE POLICY "Processors can view and update sales"
  ON public.sales FOR SELECT
  USING (public.get_user_role() = 'processor');

CREATE POLICY "Processors can update sales status"
  ON public.sales FOR UPDATE
  USING (public.get_user_role() = 'processor')
  WITH CHECK (public.get_user_role() = 'processor');

-- ---- PAYMENTS policies ----
CREATE POLICY "Super admins full access to payments"
  ON public.payments FOR ALL
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Agents can manage payments for their sales"
  ON public.payments FOR ALL
  USING (
    public.get_user_role() = 'sales_agent'
    AND sale_id IN (SELECT id FROM public.sales WHERE agent_id = auth.uid())
  );

CREATE POLICY "Processors can view payments"
  ON public.payments FOR SELECT
  USING (public.get_user_role() = 'processor');

-- ---- ATTENDANCE policies ----
CREATE POLICY "Super admins full access to attendance"
  ON public.attendance FOR ALL
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Users manage their own attendance"
  ON public.attendance FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "All authenticated users can view attendance"
  ON public.attendance FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ---- CHARGEBACKS policies ----
CREATE POLICY "Super admins full access to chargebacks"
  ON public.chargebacks FOR ALL
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Processors can manage chargebacks"
  ON public.chargebacks FOR ALL
  USING (public.get_user_role() = 'processor');

CREATE POLICY "Agents can view chargebacks for their sales"
  ON public.chargebacks FOR SELECT
  USING (
    public.get_user_role() = 'sales_agent'
    AND sale_id IN (SELECT id FROM public.sales WHERE agent_id = auth.uid())
  );

-- ---- NOTES policies ----
CREATE POLICY "Super admins full access to notes"
  ON public.notes FOR ALL
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Users can create notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view relevant notes"
  ON public.notes FOR SELECT
  USING (auth.uid() IS NOT NULL);
