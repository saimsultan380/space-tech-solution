-- Only the security-definer save function may change stored raw data after insert.
-- That keeps an agent from replacing the stored card number with the masked copy.

REVOKE UPDATE (sales_raw_data) ON TABLE public.sales FROM anon, authenticated;
