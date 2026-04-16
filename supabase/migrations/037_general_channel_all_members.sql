-- Ensure \"General\" channel is visible to all active users again
-- Adds memberships for any active user not yet in General

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

  insert into public.chat_channel_members (channel_id, user_id)
  select general_id, u.id
  from public.users u
  where u.is_active = true
    and not exists (
      select 1
      from public.chat_channel_members m
      where m.channel_id = general_id
        and m.user_id = u.id
    );
end $$;

