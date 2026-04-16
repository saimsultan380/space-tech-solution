-- Fix infinite recursion in RLS policies (chat_channel_members)
-- Approach: use a security definer helper in a private schema.

-- Create private schema for security-definer functions (not exposed)
create schema if not exists private;

-- Helper: is the current auth user a member of the given channel?
-- SECURITY DEFINER avoids RLS recursion when policies need to check membership.
create or replace function private.is_chat_channel_member(p_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_channel_members m
    where m.channel_id = p_channel_id
      and m.user_id = auth.uid()
  );
$$;

revoke all on function private.is_chat_channel_member(uuid) from public;
grant execute on function private.is_chat_channel_member(uuid) to authenticated;

-- Drop the recursive policy/policies on chat_channel_members
drop policy if exists "Users see memberships of their channels" on public.chat_channel_members;
drop policy if exists "Admins can view all memberships" on public.chat_channel_members;
drop policy if exists "Admins can add members" on public.chat_channel_members;
drop policy if exists "Admins can remove members" on public.chat_channel_members;

-- Recreate chat_channel_members policies without self-referencing recursion
-- Users can always see their own membership rows, and can see other members
-- for channels they belong to (checked via security-definer function).
create policy "Users can view channel members"
  on public.chat_channel_members for select
  using (
    user_id = auth.uid()
    or private.is_chat_channel_member(channel_id)
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

-- Also update channel/message policies to use the helper (avoids future recursion patterns)
drop policy if exists "Members can view their channels" on public.chat_channels;
drop policy if exists "Admins can view all channels" on public.chat_channels;
drop policy if exists "Admins can create channels" on public.chat_channels;

create policy "Members can view their channels"
  on public.chat_channels for select
  using (private.is_chat_channel_member(id));

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

drop policy if exists "Members can read channel messages" on public.chat_messages;
drop policy if exists "Members can send messages" on public.chat_messages;

create policy "Members can read channel messages"
  on public.chat_messages for select
  using (private.is_chat_channel_member(channel_id));

create policy "Members can send messages"
  on public.chat_messages for insert
  with check (
    sender_id = auth.uid()
    and private.is_chat_channel_member(channel_id)
  );

