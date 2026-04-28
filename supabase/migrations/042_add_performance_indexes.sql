-- Performance optimization: add indexes for commonly filtered date columns.

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at);

-- Chargebacks
CREATE INDEX IF NOT EXISTS idx_chargebacks_created_at ON public.chargebacks(created_at);

-- Leaves
CREATE INDEX IF NOT EXISTS idx_leaves_created_at ON public.leaves(created_at);

-- Sales (Compound index for dashboard stats filtering)
CREATE INDEX IF NOT EXISTS idx_sales_status_created_at ON public.sales(status, created_at);
