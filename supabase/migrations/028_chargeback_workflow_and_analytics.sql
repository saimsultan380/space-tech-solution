-- Chargeback workflow enhancements: priority, notes, and activity history.

ALTER TABLE public.chargebacks
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'
  CHECK (priority IN ('high', 'medium', 'low'));

CREATE INDEX IF NOT EXISTS idx_chargebacks_priority ON public.chargebacks(priority);
CREATE INDEX IF NOT EXISTS idx_chargebacks_date ON public.chargebacks(date);

CREATE TABLE IF NOT EXISTS public.chargeback_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chargeback_id UUID NOT NULL REFERENCES public.chargebacks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chargeback_notes_chargeback ON public.chargeback_notes(chargeback_id);
CREATE INDEX IF NOT EXISTS idx_chargeback_notes_created_at ON public.chargeback_notes(created_at DESC);

CREATE TABLE IF NOT EXISTS public.chargeback_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chargeback_id UUID NOT NULL REFERENCES public.chargebacks(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chargeback_activity_chargeback ON public.chargeback_activity(chargeback_id);
CREATE INDEX IF NOT EXISTS idx_chargeback_activity_created_at ON public.chargeback_activity(created_at DESC);

ALTER TABLE public.chargeback_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chargeback_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized users can view chargeback notes" ON public.chargeback_notes;
CREATE POLICY "Authorized users can view chargeback notes"
  ON public.chargeback_notes FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.chargebacks cb
      LEFT JOIN public.sales s ON s.id = cb.sale_id
      WHERE cb.id = chargeback_notes.chargeback_id
      AND (
        public.get_user_role() IN ('super_admin', 'processor')
        OR cb.assigned_to = auth.uid()
        OR s.agent_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Authorized users can add chargeback notes" ON public.chargeback_notes;
CREATE POLICY "Authorized users can add chargeback notes"
  ON public.chargeback_notes FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.chargebacks cb
      LEFT JOIN public.sales s ON s.id = cb.sale_id
      WHERE cb.id = chargeback_notes.chargeback_id
      AND (
        public.get_user_role() IN ('super_admin', 'processor')
        OR cb.assigned_to = auth.uid()
        OR s.agent_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Authorized users can view chargeback activity" ON public.chargeback_activity;
CREATE POLICY "Authorized users can view chargeback activity"
  ON public.chargeback_activity FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.chargebacks cb
      LEFT JOIN public.sales s ON s.id = cb.sale_id
      WHERE cb.id = chargeback_activity.chargeback_id
      AND (
        public.get_user_role() IN ('super_admin', 'processor')
        OR cb.assigned_to = auth.uid()
        OR s.agent_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Staff can add chargeback activity" ON public.chargeback_activity;
CREATE POLICY "Staff can add chargeback activity"
  ON public.chargeback_activity FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      actor_id IS NULL
      OR actor_id = auth.uid()
    )
  );
