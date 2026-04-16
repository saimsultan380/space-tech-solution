-- ============================================================
-- Team Chat: channels + messages with Realtime support
-- ============================================================

-- Channels (general, departments, DMs, etc.)
create table if not exists public.chat_channels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  is_direct   boolean not null default false,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.chat_channels enable row level security;

-- Channel membership
create table if not exists public.chat_channel_members (
  id         uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  unique(channel_id, user_id)
);

alter table public.chat_channel_members enable row level security;

create index if not exists idx_chat_channel_members_channel on public.chat_channel_members(channel_id);
create index if not exists idx_chat_channel_members_user on public.chat_channel_members(user_id);

-- Messages
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  sender_id  uuid not null references public.users(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create index if not exists idx_chat_messages_channel_created on public.chat_messages(channel_id, created_at desc);
create index if not exists idx_chat_messages_sender on public.chat_messages(sender_id);

-- RLS policies -------------------------------------------------------

-- Channels: members can see channels they belong to
create policy "Members can view their channels"
  on public.chat_channels for select
  using (
    id in (select channel_id from public.chat_channel_members where user_id = auth.uid())
  );

-- Admins can see ALL channels (needed for select-after-insert and management)
create policy "Admins can view all channels"
  on public.chat_channels for select
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  );

-- Super admins can create channels
create policy "Admins can create channels"
  on public.chat_channels for insert
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  );

-- Members: users can see memberships for their own channels
create policy "Users see memberships of their channels"
  on public.chat_channel_members for select
  using (
    channel_id in (select channel_id from public.chat_channel_members where user_id = auth.uid())
  );

-- Admins can see all memberships (needed for channel management)
create policy "Admins can view all memberships"
  on public.chat_channel_members for select
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  );

-- Admins can insert memberships
create policy "Admins can add members"
  on public.chat_channel_members for insert
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  );

-- Admins can remove memberships
create policy "Admins can remove members"
  on public.chat_channel_members for delete
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  );

-- Messages: members of a channel can read its messages
create policy "Members can read channel messages"
  on public.chat_messages for select
  using (
    channel_id in (select channel_id from public.chat_channel_members where user_id = auth.uid())
  );

-- Members can send messages to channels they belong to
create policy "Members can send messages"
  on public.chat_messages for insert
  with check (
    sender_id = auth.uid()
    and channel_id in (select channel_id from public.chat_channel_members where user_id = auth.uid())
  );

-- Seed a default "General" channel and add all existing users
do $$
declare
  gen_id uuid;
  u record;
begin
  insert into public.chat_channels (name, description)
  values ('General', 'Company-wide discussion channel')
  returning id into gen_id;

  for u in select id from public.users where is_active = true loop
    insert into public.chat_channel_members (channel_id, user_id)
    values (gen_id, u.id);
  end loop;
end $$;

-- Enable Realtime on chat_messages for live updates
alter publication supabase_realtime add table public.chat_messages;
