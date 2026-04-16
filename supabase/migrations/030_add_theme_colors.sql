  -- Admin-configurable theme colors for sidebar, buttons, and active tabs

  ALTER TABLE public.company_settings
    ADD COLUMN IF NOT EXISTS sidebar_color TEXT,
    ADD COLUMN IF NOT EXISTS sidebar_text_color TEXT,
    ADD COLUMN IF NOT EXISTS button_color TEXT,
    ADD COLUMN IF NOT EXISTS button_text_color TEXT,
    ADD COLUMN IF NOT EXISTS active_tab_color TEXT,
    ADD COLUMN IF NOT EXISTS active_tab_text_color TEXT;
