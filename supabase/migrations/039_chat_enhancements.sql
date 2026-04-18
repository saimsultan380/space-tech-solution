-- Add pinned messages support
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
