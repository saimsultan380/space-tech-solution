-- Sales are recorded immediately; no pending approval step.
UPDATE public.sales SET status = 'approved' WHERE status = 'pending';
ALTER TABLE public.sales ALTER COLUMN status SET DEFAULT 'approved';
