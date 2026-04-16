-- Fix chat RLS policies: drop old ones and recreate with admin access

-- Drop existing policies on chat_channels
drop policy if exists "Members can view their channels" on public.chat_channels;
drop policy if exists "Admins can view all channels" on public.chat_channels;
drop policy if exists "Admins can create channels" on public.chat_channels;

-- Drop existing policies on chat_channel_members
drop policy if exists "Users see memberships of their channels" on public.chat_channel_members;
drop policy if exists "Admins manage membership" on public.chat_channel_members;
drop policy if exists "Admins can view all memberships" on public.chat_channel_members;
drop policy if exists "Admins can add members" on public.chat_channel_members;
drop policy if exists "Admins can remove members" on public.chat_channel_members;

-- Drop existing policies on chat_messages
drop policy if exists "Members can read channel messages" on public.chat_messages;
drop policy if exists "Members can send messages" on public.chat_messages;

-- ── chat_channels ──

create policy "Members can view their channels"
  on public.chat_channels for select
  using (
    id in (select channel_id from public.chat_channel_members where user_id = auth.uid())
  );

create policy "Admins can view all channels"
  on public.chat_channels for select
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  );

create policy "Admins can create channels"
  on public.chat_channels for insert
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  );

-- ── chat_channel_members ──

create policy "Users see memberships of their channels"
  on public.chat_channel_members for select
  using (
    channel_id in (select channel_id from public.chat_channel_members where user_id = auth.uid())
  );

create policy "Admins can view all memberships"
  on public.chat_channel_members for select
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  );

create policy "Admins can add members"
  on public.chat_channel_members for insert
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  );

create policy "Admins can remove members"
  on public.chat_channel_members for delete
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  );

-- ── chat_messages ──

create policy "Members can read channel messages"
  on public.chat_messages for select
  using (
    channel_id in (select channel_id from public.chat_channel_members where user_id = auth.uid())
  );

create policy "Members can send messages"
  on public.chat_messages for insert
  with check (
    sender_id = auth.uid()
    and channel_id in (select channel_id from public.chat_channel_members where user_id = auth.uid())
  );
