-- ============================================================
-- 053: Fix self-chat dm_partner in get_my_chat_channels
-- Self-chat channels have only one member (the user themselves).
-- The previous dm_partners CTE excluded the current user, so
-- self-chat returned null dm_partner_id. This fix returns the
-- user's own info as the dm_partner for self-chat channels.
-- ============================================================

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
        SELECT m.channel_id
        FROM public.chat_channel_members m
        WHERE m.user_id = auth.uid()
    ),
    latest_messages AS (
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
    -- Count members per direct channel to detect self-chat (1 member)
    channel_member_counts AS (
        SELECT channel_id, COUNT(*) as member_count
        FROM public.chat_channel_members
        WHERE channel_id IN (SELECT channel_id FROM user_channels)
        GROUP BY channel_id
    ),
    dm_partners AS (
        -- For regular DMs: get the OTHER user
        SELECT 
            m.channel_id,
            u.id as partner_id,
            u.full_name as partner_name,
            u.avatar_url as partner_avatar_url
        FROM public.chat_channel_members m
        JOIN public.users u ON u.id = m.user_id
        JOIN public.chat_channels c ON c.id = m.channel_id
        JOIN channel_member_counts cmc ON cmc.channel_id = m.channel_id
        WHERE m.channel_id IN (SELECT channel_id FROM user_channels)
          AND m.user_id != auth.uid()   -- other user in normal DMs
          AND c.is_direct = true
          AND cmc.member_count > 1      -- only for multi-member DMs

        UNION ALL

        -- For self-chat: return the current user's own info
        SELECT
            m.channel_id,
            u.id as partner_id,
            u.full_name as partner_name,
            u.avatar_url as partner_avatar_url
        FROM public.chat_channel_members m
        JOIN public.users u ON u.id = m.user_id
        JOIN public.chat_channels c ON c.id = m.channel_id
        JOIN channel_member_counts cmc ON cmc.channel_id = m.channel_id
        WHERE m.channel_id IN (SELECT channel_id FROM user_channels)
          AND m.user_id = auth.uid()    -- current user (self-chat)
          AND c.is_direct = true
          AND cmc.member_count = 1      -- only single-member channels
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
    ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
