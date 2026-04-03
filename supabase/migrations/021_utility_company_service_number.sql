-- Utility account / service identifier from the utility company (e.g. service or account number on the bill).
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS utility_company_service_number TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.sales.utility_company_service_number IS 'Utility company service or account number (utility sales only).';
