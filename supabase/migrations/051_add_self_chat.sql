-- ============================================================
-- 051: Self Chat Feature (WhatsApp style)
-- ============================================================

-- Ensure soft-delete columns exist (using IF NOT EXISTS which is more robust)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 1. Function to ensure every user has a self-chat channel
CREATE OR REPLACE FUNCTION public.ensure_self_chat(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
    v_channel_id uuid;
BEGIN
    -- Check if self-chat already exists
    -- A self-chat is a direct channel where the user is the ONLY member
    SELECT c.id INTO v_channel_id
    FROM public.chat_channels c
    JOIN public.chat_channel_members m ON m.channel_id = c.id
    WHERE c.is_direct = true
      AND c.name = 'Self Chat'
      AND m.user_id = p_user_id
      AND (SELECT count(*) FROM public.chat_channel_members WHERE channel_id = c.id) = 1
    LIMIT 1;

    IF v_channel_id IS NULL THEN
        -- Create new self-chat channel
        INSERT INTO public.chat_channels (name, description, is_direct, created_by)
        VALUES ('Self Chat', 'Message yourself', true, p_user_id)
        RETURNING id INTO v_channel_id;

        -- Add user as the only member
        INSERT INTO public.chat_channel_members (channel_id, user_id)
        VALUES (v_channel_id, p_user_id);
    END IF;

    RETURN v_channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger to create self-chat for new users
CREATE OR REPLACE FUNCTION public.on_user_created_self_chat()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.ensure_self_chat(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_user_created_self_chat ON public.users;
CREATE TRIGGER tr_on_user_created_self_chat
AFTER INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.on_user_created_self_chat();

-- 3. Create self-chats for all existing users
-- Use dynamic SQL to avoid parser errors if deleted_at was just added
DO $$
DECLARE
    u record;
BEGIN
    FOR u IN EXECUTE 'SELECT id FROM public.users WHERE is_active = true AND deleted_at IS NULL' LOOP
        PERFORM public.ensure_self_chat(u.id);
    END LOOP;
END $$;

-- 4. Update get_my_chat_channels RPC to handle self-chats correctly
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
    channel_member_counts AS (
        SELECT m.channel_id, count(*) as member_count
        FROM public.chat_channel_members m
        WHERE m.channel_id IN (SELECT channel_id FROM user_channels)
        GROUP BY m.channel_id
    ),
    dm_partners AS (
        SELECT 
            m.channel_id,
            u.id as partner_id,
            u.full_name as partner_name,
            u.avatar_url as partner_avatar_url
        FROM public.chat_channel_members m
        JOIN public.users u ON u.id = m.user_id
        JOIN public.chat_channels c ON c.id = m.channel_id
        JOIN channel_member_counts cmc ON cmc.channel_id = c.id
        WHERE m.channel_id IN (SELECT channel_id FROM user_channels)
          AND c.is_direct = true
          AND (
              -- Regular DM: partner is the other user
              (cmc.member_count > 1 AND m.user_id != auth.uid())
              OR
              -- Self Chat: partner is yourself
              (cmc.member_count = 1 AND m.user_id = auth.uid())
          )
    )
    SELECT 
        c.id,
        CASE 
            WHEN c.is_direct = true AND dp.partner_id = auth.uid() THEN 'You (Message Yourself)'
            WHEN c.is_direct = true THEN dp.partner_name
            ELSE c.name 
        END as name,
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
