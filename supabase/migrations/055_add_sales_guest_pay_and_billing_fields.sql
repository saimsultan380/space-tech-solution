-- ============================================
-- Add guest pay and billing status fields to sales table
-- ============================================

-- Add new fields to sales table
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS utility_company_phone TEXT,
  ADD COLUMN IF NOT EXISTS guest_pay_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_pay_link TEXT,
  ADD COLUMN IF NOT EXISTS payment_status_after_sale TEXT CHECK (payment_status_after_sale IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS expected_next_bill_date DATE;

-- Add indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_sales_guest_pay_enabled ON public.sales(guest_pay_enabled);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status_after_sale ON public.sales(payment_status_after_sale);
CREATE INDEX IF NOT EXISTS idx_sales_expected_next_bill_date ON public.sales(expected_next_bill_date);

-- Add comment for documentation
COMMENT ON COLUMN public.sales.utility_company_phone IS 'Phone number for the utility company';
COMMENT ON COLUMN public.sales.guest_pay_enabled IS 'Whether guest pay is enabled for this sale';
COMMENT ON COLUMN public.sales.guest_pay_link IS 'Link for guest payment portal';
COMMENT ON COLUMN public.sales.payment_status_after_sale IS 'Payment status after the sale is completed';
COMMENT ON COLUMN public.sales.expected_next_bill_date IS 'Expected date for the next bill';
