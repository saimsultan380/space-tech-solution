-- Allow processing account status to be empty (NULL) when missing in import.
ALTER TABLE public.processing_accounts
  ALTER COLUMN status DROP NOT NULL,
  ALTER COLUMN status DROP DEFAULT;
