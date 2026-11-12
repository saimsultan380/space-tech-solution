-- Show dollars by default. Existing non-USD choices other than PKR are left as saved.
UPDATE public.users
SET preferred_currency = 'USD'
WHERE preferred_currency IS NULL OR preferred_currency = 'PKR';

-- Call-setup date matching uses US Eastern instead of Karachi.
DO $$
DECLARE
  fn oid;
  def text;
BEGIN
  FOR fn IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_employee_monthly_stats', 'get_employee_monthly_stats_range')
  LOOP
    def := pg_get_functiondef(fn);
    def := replace(def, 'Asia/Karachi', 'America/New_York');
    EXECUTE def;
  END LOOP;
END $$;
