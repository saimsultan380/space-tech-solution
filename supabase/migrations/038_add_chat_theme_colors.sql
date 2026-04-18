ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS chat_user_bubble_color TEXT,
  ADD COLUMN IF NOT EXISTS chat_user_bubble_text_color TEXT,
  ADD COLUMN IF NOT EXISTS chat_bot_bubble_color TEXT,
  ADD COLUMN IF NOT EXISTS chat_bot_bubble_text_color TEXT;
