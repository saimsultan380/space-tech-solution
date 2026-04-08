-- Security hardening: pin function search_path and tighten permissive RLS policy.

-- 1) Pin search_path on key public functions flagged by linter.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'generate_employee_id'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.generate_employee_id() SET search_path TO public, pg_temp';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'tr_populate_employee_id'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.tr_populate_employee_id() SET search_path TO public, pg_temp';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_updated_at'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.update_updated_at() SET search_path TO public, pg_temp';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_user_role'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.get_user_role() SET search_path TO public, pg_temp';
  END IF;
END $$;

-- 2) Tighten overly permissive attendance_notifications INSERT policy.
-- Previous policy used WITH CHECK (true), which allows any insert path under RLS.
DROP POLICY IF EXISTS "Service can insert attendance notifications" ON public.attendance_notifications;

CREATE POLICY "Service can insert attendance notifications"
  ON public.attendance_notifications
  FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');
