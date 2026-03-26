-- ============================================
-- Add extended profile fields to users table
-- ============================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS education_degree TEXT,
  ADD COLUMN IF NOT EXISTS joining_date DATE,
  ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern'));

COMMENT ON COLUMN public.users.department IS 'Department the employee belongs to';
COMMENT ON COLUMN public.users.company_name IS 'Company/organization name for the employee';
COMMENT ON COLUMN public.users.education_degree IS 'Highest education degree';
COMMENT ON COLUMN public.users.joining_date IS 'Date when the employee joined';
COMMENT ON COLUMN public.users.employment_type IS 'Type of employment: full_time, part_time, contract, intern';
