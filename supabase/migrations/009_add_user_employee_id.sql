-- Add employee_id to users table with auto-generation
CREATE SEQUENCE IF NOT EXISTS user_employee_id_seq START 1;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE;

-- Function to generate the next employee ID
CREATE OR REPLACE FUNCTION generate_employee_id()
RETURNS TEXT AS 
DECLARE
  next_val BIGINT;
BEGIN
  SELECT nextval('user_employee_id_seq') INTO next_val;
  RETURN 'ST-' || LPAD(next_val::TEXT, 4, '0');
END;
 LANGUAGE plpgsql;

-- Trigger to auto-populate employee_id on insert if not provided
CREATE OR REPLACE FUNCTION tr_populate_employee_id()
RETURNS TRIGGER AS 
BEGIN
  IF NEW.employee_id IS NULL THEN
    NEW.employee_id := generate_employee_id();
  END IF;
  RETURN NEW;
END;
 LANGUAGE plpgsql;

CREATE TRIGGER tr_users_populate_employee_id
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION tr_populate_employee_id();

-- Backfill existing users
DO 
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.users WHERE employee_id IS NULL ORDER BY created_at ASC LOOP
    UPDATE public.users SET employee_id = generate_employee_id() WHERE id = u.id;
  END LOOP;
END;
;
