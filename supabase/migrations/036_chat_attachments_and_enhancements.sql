-- Chat enhancements: attachments, channel avatar, reply support, clear chat

-- Channel avatar
alter table public.chat_channels
  add column if not exists avatar_url text;

-- Admin can update channels
create policy "Admins can update channels"
  on public.chat_channels for update
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  )
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  );

-- Message attachments & reply
alter table public.chat_messages
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint,
  add column if not exists reply_to_id uuid references public.chat_messages(id) on delete set null;

create index if not exists idx_chat_messages_reply on public.chat_messages(reply_to_id);

-- Admin can hard-delete messages (for clear chat)
drop policy if exists "Admins can delete any message" on public.chat_messages;
create policy "Admins can delete any message"
  on public.chat_messages for delete
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  );

-- Users can also hard-delete their own messages
create policy "Users can delete own messages"
  on public.chat_messages for delete
  using (sender_id = auth.uid());

-- Storage bucket for chat attachments
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  true,
  52428800, -- 50MB
  array['image/jpeg','image/png','image/gif','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain','text/csv']
)
on conflict (id) do nothing;

-- Storage policies: authenticated users can upload
create policy "Authenticated users can upload chat files"
  on storage.objects for insert
  with check (bucket_id = 'chat-attachments' and auth.role() = 'authenticated');

create policy "Anyone can view chat files"
  on storage.objects for select
  using (bucket_id = 'chat-attachments');

create policy "Users can delete own chat files"
  on storage.objects for delete
  using (bucket_id = 'chat-attachments' and auth.uid()::text = (storage.foldername(name))[1]);
