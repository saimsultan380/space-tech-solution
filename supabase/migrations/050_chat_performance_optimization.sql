-- ============================================================
-- 050: Chat Performance Optimization
-- ============================================================

-- Ensure soft-delete columns exist (in case migration 045 was skipped or failed)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_channels' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.chat_channels ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.chat_messages ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- 1. Optimized function to get all channel summaries for a user in a single query
CREATE OR REPLACE FUNCTION public.get_my_chat_channels()
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    is_direct boolean,
    created_by uuid,
    created_at timestamptz,
    avatar_url text,
    last_message_at timestamptz,
    last_message_content text,
    last_message_sender_name text,
    last_message_created_at timestamptz,
    dm_partner_id uuid,
    dm_partner_name text,
    dm_partner_avatar_url text
) AS $$
BEGIN
    RETURN QUERY
    WITH user_channels AS (
        -- Get all channels the user is a member of
        SELECT m.channel_id
        FROM public.chat_channel_members m
        WHERE m.user_id = auth.uid()
    ),
    latest_messages AS (
        -- Get the latest message for each of those channels
        SELECT DISTINCT ON (m.channel_id)
            m.channel_id,
            m.content,
            m.created_at,
            u.full_name as sender_name
        FROM public.chat_messages m
        JOIN public.users u ON u.id = m.sender_id
        WHERE m.channel_id IN (SELECT channel_id FROM user_channels)
          AND m.is_deleted = false
        ORDER BY m.channel_id, m.created_at DESC
    ),
    dm_partners AS (
        -- Get the partner info for direct messages
        SELECT 
            m.channel_id,
            u.id as partner_id,
            u.full_name as partner_name,
            u.avatar_url as partner_avatar_url
        FROM public.chat_channel_members m
        JOIN public.users u ON u.id = m.user_id
        JOIN public.chat_channels c ON c.id = m.channel_id
        WHERE m.channel_id IN (SELECT channel_id FROM user_channels)
          AND m.user_id != auth.uid()
          AND c.is_direct = true
    )
    SELECT 
        c.id,
        c.name,
        c.description,
        c.is_direct,
        c.created_by,
        c.created_at,
        c.avatar_url,
        c.last_message_at,
        lm.content as last_message_content,
        lm.sender_name as last_message_sender_name,
        lm.created_at as last_message_created_at,
        dp.partner_id as dm_partner_id,
        dp.partner_name as dm_partner_name,
        dp.partner_avatar_url as dm_partner_avatar_url
    FROM public.chat_channels c
    LEFT JOIN latest_messages lm ON lm.channel_id = c.id
    LEFT JOIN dm_partners dp ON dp.channel_id = c.id
    WHERE c.id IN (SELECT channel_id FROM user_channels)
      AND c.deleted_at IS NULL
    ORDER BY c.last_message_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Add composite index for chat message fetching and unread counts
-- Speed up unread count queries and message history lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_sender_created 
ON public.chat_messages(channel_id, sender_id, created_at DESC);

-- 3. Speed up membership lookups by user
-- While (channel_id, user_id) is unique, having (user_id, channel_id) as a 
-- composite index is beneficial for "get my channels" queries.
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user_channel 
ON public.chat_channel_members(user_id, channel_id);

-- 4. RPC to get a specific DM channel to avoid client-side looping
CREATE OR REPLACE FUNCTION public.get_direct_message_channel(other_user_id uuid)
RETURNS uuid AS $$
    SELECT m1.channel_id
    FROM public.chat_channel_members m1
    JOIN public.chat_channel_members m2 ON m1.channel_id = m2.channel_id
    JOIN public.chat_channels c ON c.id = m1.channel_id
    WHERE m1.user_id = auth.uid()
      AND m2.user_id = other_user_id
      AND c.is_direct = true
      AND c.deleted_at IS NULL
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
