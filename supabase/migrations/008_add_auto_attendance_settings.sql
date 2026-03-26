-- ============================================
-- Add auto attendance notification and leave settings
-- ============================================

-- Add columns to attendance_settings for auto-notification and auto-leave
ALTER TABLE public.attendance_settings
  ADD COLUMN IF NOT EXISTS notify_after_minutes INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS auto_leave_after_minutes INTEGER NOT NULL DEFAULT 240,
  ADD COLUMN IF NOT EXISTS auto_leave_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_leave_type TEXT NOT NULL DEFAULT 'casual';

-- Add comment for documentation
COMMENT ON COLUMN public.attendance_settings.notify_after_minutes IS 'Minutes after late_after_time to send notification for missing attendance';
COMMENT ON COLUMN public.attendance_settings.auto_leave_after_minutes IS 'Minutes after late_after_time to auto-create leave for absent employees';
COMMENT ON COLUMN public.attendance_settings.auto_leave_enabled IS 'Whether to auto-create leaves for absent employees';
COMMENT ON COLUMN public.attendance_settings.auto_leave_type IS 'Type of leave to auto-create (casual, sick, etc.)';

-- Add source column to leaves table to track auto-generated leaves
ALTER TABLE public.leaves
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto'));

COMMENT ON COLUMN public.leaves.source IS 'Whether leave was created manually by user or auto by system';

-- Create index for efficient querying of auto leaves
CREATE INDEX IF NOT EXISTS idx_leaves_source ON public.leaves(source);

-- Add attendance_notifications table to track which notifications were sent
-- This prevents duplicate notifications
CREATE TABLE IF NOT EXISTS public.attendance_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('reminder', 'auto_leave')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_attendance_notifications_user_date ON public.attendance_notifications(user_id, date);

-- Enable RLS
ALTER TABLE public.attendance_notifications ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all records
CREATE POLICY "Super admins manage attendance notifications"
  ON public.attendance_notifications FOR ALL
  USING (public.get_user_role() = 'super_admin');

-- Service role can insert (for cron jobs)
CREATE POLICY "Service can insert attendance notifications"
  ON public.attendance_notifications FOR INSERT
  WITH CHECK (true);
