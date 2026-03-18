-- Add Marketing Budget to allowed_modules for existing super admins and processors who have custom modules set
UPDATE public.users
SET allowed_modules = array_append(allowed_modules, '/dashboard/marketing-budget')
WHERE (role = 'super_admin' OR role = 'processor')
  AND allowed_modules IS NOT NULL
  AND NOT (allowed_modules @> ARRAY['/dashboard/marketing-budget']::TEXT[]);
