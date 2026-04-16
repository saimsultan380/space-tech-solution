-- Fix channel visibility: stop "General" being visible to everyone
-- This migration removes existing memberships for non-admin users from the seeded "General" channel.
-- Channels are visible only if a user is a member (RLS + getMyChannels).

do $$
declare
  general_id uuid;
begin
  select id into general_id
  from public.chat_channels
  where lower(name) = 'general'
  order by created_at asc
  limit 1;

  if general_id is null then
    return;
  end if;

  -- Keep only super_admin members in General
  delete from public.chat_channel_members m
  using public.users u
  where m.user_id = u.id
    and m.channel_id = general_id
    and coalesce(u.role, '') <> 'super_admin';
end $$;

