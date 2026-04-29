-- Performance optimization: add indexes for commonly filtered date columns.

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at);

-- Chargebacks
CREATE INDEX IF NOT EXISTS idx_chargebacks_created_at ON public.chargebacks(created_at);

-- Leaves
CREATE INDEX IF NOT EXISTS idx_leaves_created_at ON public.leaves(created_at);

-- Sales (Compound index for dashboard stats filtering)
CREATE INDEX IF NOT EXISTS idx_sales_status_created_at ON public.sales(status, created_at);

-- Soft-delete partial indexes: speed up every query that filters deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_sales_active ON public.sales(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(created_at) WHERE deleted_at IS NULL;

-- Compound indexes for common dashboard/analytics query patterns
CREATE INDEX IF NOT EXISTS idx_sales_agent_created ON public.sales(agent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_processor_created ON public.sales(processor_id, created_at) WHERE processor_id IS NOT NULL;

-- Attendance: common filter by date range + user
CREATE INDEX IF NOT EXISTS idx_attendance_date_user ON public.attendance(date, user_id);

-- Leaves: common filter by status + date range
CREATE INDEX IF NOT EXISTS idx_leaves_status ON public.leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_date_range ON public.leaves(start_date, end_date) WHERE status = 'approved';
