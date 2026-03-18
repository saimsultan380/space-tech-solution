CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  shift_start_time TIME NOT NULL DEFAULT '09:00:00',
  late_after_time TIME NOT NULL DEFAULT '09:15:00',
  shift_end_time TIME NOT NULL DEFAULT '18:00:00',
  checkout_latest_time TIME NOT NULL DEFAULT '23:00:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.attendance_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS tr_attendance_settings_updated_at ON public.attendance_settings;
CREATE TRIGGER tr_attendance_settings_updated_at BEFORE UPDATE ON public.attendance_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to attendance settings" ON public.attendance_settings;
CREATE POLICY "Super admins full access to attendance settings"
  ON public.attendance_settings FOR ALL
  USING (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Authenticated users can view attendance settings" ON public.attendance_settings;
CREATE POLICY "Authenticated users can view attendance settings"
  ON public.attendance_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);
