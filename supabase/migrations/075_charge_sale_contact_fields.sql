-- Contact fields entered in Charge a Sale. Existing sales are not updated.

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS charge_first_name text,
  ADD COLUMN IF NOT EXISTS charge_last_name text,
  ADD COLUMN IF NOT EXISTS charge_amount numeric(12, 2),
  ADD COLUMN IF NOT EXISTS charge_phone text,
  ADD COLUMN IF NOT EXISTS charge_email text;

GRANT SELECT (
  charge_first_name,
  charge_last_name,
  charge_amount,
  charge_phone,
  charge_email
) ON TABLE public.sales TO anon, authenticated;

GRANT UPDATE (
  charge_first_name,
  charge_last_name,
  charge_amount,
  charge_phone,
  charge_email
) ON TABLE public.sales TO anon, authenticated;
