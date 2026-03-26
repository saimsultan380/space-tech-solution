-- Create a simple table for agent name dropdown in Sales form

CREATE TABLE IF NOT EXISTS public.agent_names (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_names_name ON public.agent_names(name);

-- RLS
ALTER TABLE public.agent_names ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view agent names" ON public.agent_names;
CREATE POLICY "Authenticated users can view agent names"
  ON public.agent_names FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Super admins can insert agent names" ON public.agent_names;
CREATE POLICY "Super admins can insert agent names"
  ON public.agent_names FOR INSERT
  WITH CHECK (public.get_user_role() = 'super_admin');

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS agent_name TEXT;

