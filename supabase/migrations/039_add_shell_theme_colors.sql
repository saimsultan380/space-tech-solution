ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS shell_bg_color TEXT,
  ADD COLUMN IF NOT EXISTS shell_text_color TEXT;
