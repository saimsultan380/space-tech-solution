-- Separate formatted sale details from the existing Other Sale Data text field.
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS sales_raw_data text NOT NULL DEFAULT '';
