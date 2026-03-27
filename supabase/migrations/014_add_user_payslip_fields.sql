-- ============================================
-- Add payslip-related profile fields to users table
-- These fields will auto-populate payslip forms
-- ============================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Permanent' CHECK (category IN ('Permanent', 'Contract')),
  ADD COLUMN IF NOT EXISTS job_position TEXT,
  ADD COLUMN IF NOT EXISTS father_name TEXT,
  ADD COLUMN IF NOT EXISTS cnic TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS pay_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS pay_rate DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_pay DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_through TEXT DEFAULT 'Bank' CHECK (paid_through IN ('Bank', 'Cash', 'Cheque')),
  ADD COLUMN IF NOT EXISTS bank_account_no TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch TEXT;

COMMENT ON COLUMN public.users.category IS 'Employment category: Permanent or Contract';
COMMENT ON COLUMN public.users.job_position IS 'Job position/title of the employee';
COMMENT ON COLUMN public.users.father_name IS 'Father name of the employee';
COMMENT ON COLUMN public.users.cnic IS 'CNIC number (National ID)';
COMMENT ON COLUMN public.users.address IS 'Residential address';
COMMENT ON COLUMN public.users.pay_days IS 'Standard pay days per   ';
COMMENT ON COLUMN public.users.pay_rate IS 'Pay rate (daily/hourly)';
COMMENT ON COLUMN public.users.gross_pay IS 'Gross pay amount';
COMMENT ON COLUMN public.users.basic_salary IS 'Basic salary amount';
COMMENT ON COLUMN public.users.paid_through IS 'Preferred salary payment method: Bank, Cash, or Cheque';
COMMENT ON COLUMN public.users.bank_account_no IS 'Bank account number for salary';
COMMENT ON COLUMN public.users.bank_branch IS 'Bank branch name';
