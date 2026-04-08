-- Separate call-log customers from sales-created customers
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'call_log'
CHECK (source IN ('call_log', 'sales'));

CREATE INDEX IF NOT EXISTS idx_customers_source ON public.customers(source);

-- Backfill existing rows:
-- If a customer is linked to any sale, classify as sales; otherwise call_log.
UPDATE public.customers c
SET source = CASE
  WHEN EXISTS (SELECT 1 FROM public.sales s WHERE s.customer_id = c.id) THEN 'sales'
  ELSE 'call_log'
END
WHERE c.source IS DISTINCT FROM CASE
  WHEN EXISTS (SELECT 1 FROM public.sales s WHERE s.customer_id = c.id) THEN 'sales'
  ELSE 'call_log'
END;
