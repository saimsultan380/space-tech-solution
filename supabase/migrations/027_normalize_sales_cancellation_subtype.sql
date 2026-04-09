-- Normalize legacy misspelling "cancelation" -> "cancellation" in sales subtype.
-- This migration is idempotent and safe to run multiple times.

DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Drop any existing CHECK constraint that targets the subtype column.
  SELECT tc.constraint_name
    INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
   AND tc.table_schema = ccu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'sales'
    AND tc.constraint_type = 'CHECK'
    AND ccu.column_name = 'subtype'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.sales DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Rewrite legacy data before enforcing the canonical enum set.
UPDATE public.sales
SET subtype = 'cancellation'
WHERE subtype = 'cancelation';

ALTER TABLE public.sales
  ADD CONSTRAINT sales_subtype_check
  CHECK (subtype IN ('new', 'bill', 'premium', 'cancellation'));
