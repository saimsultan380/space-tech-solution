-- ============================================
-- Performance Optimization Indexes
-- Date: 2024-01-15
-- Purpose: Add indexes to improve query performance
-- ============================================

-- Sales table indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sales_created_at_agent ON public.sales(created_at DESC, agent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_status_created_at ON public.sales(status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_agent_status_date ON public.sales(agent_id, status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_type_status_date ON public.sales(sale_type, status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales(sale_date DESC) WHERE deleted_at IS NULL AND sale_date IS NOT NULL;

-- Attendance table indexes
CREATE INDEX IF NOT EXISTS idx_attendance_user_date_desc ON public.attendance(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date DESC);

-- Customers table indexes
CREATE INDEX IF NOT EXISTS idx_customers_created_by_date ON public.customers(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_email_lower ON public.customers(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_sale_created ON public.payments(sale_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_customer_created ON public.payments(customer_id, created_at DESC);

-- Chargebacks table indexes
CREATE INDEX IF NOT EXISTS idx_chargebacks_sale_status ON public.chargebacks(sale_id, status);
CREATE INDEX IF NOT EXISTS idx_chargebacks_date_status ON public.chargebacks(date DESC, status);

-- Notes table indexes
CREATE INDEX IF NOT EXISTS idx_notes_sale_created ON public.notes(sale_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_customer_created ON public.notes(customer_id, created_at DESC);

-- Leaves table indexes (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leaves') THEN
    CREATE INDEX IF NOT EXISTS idx_leaves_user_status ON public.leaves(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_leaves_date_range ON public.leaves(start_date, end_date);
  END IF;
END $$;

-- Payslips table indexes (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payslips') THEN
    CREATE INDEX IF NOT EXISTS idx_payslips_user_period ON public.payslips(user_id, period_start DESC);
  END IF;
END $$;

-- Update table statistics for query planner
ANALYZE public.sales;
ANALYZE public.customers;
ANALYZE public.attendance;
ANALYZE public.payments;
ANALYZE public.chargebacks;
ANALYZE public.notes;
ANALYZE public.users;

-- Add comments for documentation
COMMENT ON INDEX idx_sales_created_at_agent IS 'Optimizes queries filtering by date and agent';
COMMENT ON INDEX idx_sales_agent_status_date IS 'Optimizes agent dashboard queries';
COMMENT ON INDEX idx_attendance_user_date_desc IS 'Optimizes attendance history queries';
COMMENT ON INDEX idx_customers_email_lower IS 'Optimizes case-insensitive email searches';
