-- Bill payment status shown in Sales raw data popup
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS bill_payment_status TEXT
  CHECK (
    bill_payment_status IS NULL
    OR bill_payment_status = ANY (ARRAY[
      'already_paid',
      'reversed_paid_card',
      'reversed_paid_check',
      'bill_on_card',
      'bill_on_cash'
    ])
  );

COMMENT ON COLUMN public.sales.bill_payment_status IS 'Processor bill payment status from Sales raw data popup';

CREATE INDEX IF NOT EXISTS idx_sales_bill_payment_status
  ON public.sales(bill_payment_status)
  WHERE bill_payment_status IS NOT NULL;

-- Column privileges omit sales_raw_data; new column must be granted explicitly
GRANT SELECT (bill_payment_status) ON TABLE public.sales TO anon, authenticated;
GRANT UPDATE (bill_payment_status) ON TABLE public.sales TO anon, authenticated;
