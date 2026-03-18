-- Corrected Migration: Update payslip statuses and remove notes column
-- The order is critical: DROP -> UPDATE -> ADD

-- 1. Remove the old constraint first
ALTER TABLE public.payslips 
  DROP CONSTRAINT IF EXISTS payslips_status_check;

-- 2. Update all existing rows to the new allowed values BEFORE adding the constraint back
-- This ensures no row violates the new check
UPDATE public.payslips SET status = 'processed' WHERE status = 'draft';
UPDATE public.payslips SET status = 'paid' WHERE status = 'sent';

-- Fallback: If any row has a value that isn't 'processed' or 'paid', set it to 'processed'
-- This prevents the "check constraint violated" error during the next step
UPDATE public.payslips 
SET status = 'processed' 
WHERE status NOT IN ('processed', 'paid') OR status IS NULL;

-- 3. Now it is safe to add the new constraint
ALTER TABLE public.payslips
  ADD CONSTRAINT payslips_status_check CHECK (status IN ('processed', 'paid'));

-- 4. Remove the notes column as previously requested
ALTER TABLE public.payslips DROP COLUMN IF EXISTS notes;
