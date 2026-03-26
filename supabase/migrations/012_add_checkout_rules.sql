-- ============================================
-- Add checkout rule settings
-- ============================================

ALTER TABLE public.attendance_settings
  ADD COLUMN IF NOT EXISTS checkout_grace_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_early_checkout BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS early_checkout_minutes INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.attendance_settings.checkout_grace_minutes IS 'Minutes after shift_end_time during which checkout is still allowed (grace window). If > 0, this can be used to compute the effective latest checkout time.';
COMMENT ON COLUMN public.attendance_settings.allow_early_checkout IS 'Whether employees may checkout before shift_end_time (subject to early_checkout_minutes).';
COMMENT ON COLUMN public.attendance_settings.early_checkout_minutes IS 'How many minutes before shift_end_time checkout is allowed when allow_early_checkout is true.';

