-- Employee ID on users: full setup if 009 was never applied, plus hardened trigger,
-- service RPC, and backfill. Safe to re-run (IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).

CREATE SEQUENCE IF NOT EXISTS public.user_employee_id_seq START 1;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS employee_id text;

-- One non-null ID per user; multiple NULLs allowed until backfill completes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_id_unique ON public.users (employee_id);

CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_val bigint;
BEGIN
  SELECT nextval('public.user_employee_id_seq') INTO next_val;
  RETURN 'ST-' || lpad(next_val::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.tr_populate_employee_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.employee_id IS NULL OR trim(both from NEW.employee_id) = '' THEN
    NEW.employee_id := public.generate_employee_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_users_populate_employee_id ON public.users;
CREATE TRIGGER tr_users_populate_employee_id
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.tr_populate_employee_id();

CREATE OR REPLACE FUNCTION public.ensure_user_employee_id(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text;
BEGIN
  SELECT employee_id INTO v_id FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;
  IF v_id IS NULL OR trim(both from v_id) = '' THEN
    UPDATE public.users
    SET employee_id = public.generate_employee_id()
    WHERE id = p_user_id
    RETURNING employee_id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_employee_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_employee_id(uuid) TO service_role;

DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN
    SELECT id FROM public.users
    WHERE employee_id IS NULL OR trim(both from employee_id) = ''
    ORDER BY created_at ASC
  LOOP
    UPDATE public.users
    SET employee_id = public.generate_employee_id()
    WHERE id = u.id;
  END LOOP;
END $$;
