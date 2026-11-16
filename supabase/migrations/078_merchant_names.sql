-- Merchant company names chosen from Settings. Existing sales are not updated.

CREATE TABLE IF NOT EXISTS public.merchant_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_names_name_not_blank CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS merchant_names_name_lower_idx
  ON public.merchant_names (lower(name));

ALTER TABLE public.merchant_names ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_names_read ON public.merchant_names;
CREATE POLICY merchant_names_read
  ON public.merchant_names
  FOR SELECT
  TO authenticated
  USING ((SELECT public.get_user_role()) IS NOT NULL);

DROP POLICY IF EXISTS merchant_names_write ON public.merchant_names;
CREATE POLICY merchant_names_write
  ON public.merchant_names
  FOR ALL
  TO authenticated
  USING ((SELECT public.get_user_role()) = 'super_admin')
  WITH CHECK ((SELECT public.get_user_role()) = 'super_admin');

REVOKE ALL ON public.merchant_names FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_names TO authenticated;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS charge_merchant_name text;

GRANT SELECT (charge_merchant_name) ON TABLE public.sales TO anon, authenticated;
GRANT UPDATE (charge_merchant_name) ON TABLE public.sales TO anon, authenticated;
