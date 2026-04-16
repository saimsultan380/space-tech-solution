-- Add edit/delete support for chat messages

alter table public.chat_messages
  add column if not exists is_edited boolean not null default false,
  add column if not exists updated_at timestamptz,
  add column if not exists is_deleted boolean not null default false;

-- Users can update their own messages (edit)
create policy "Users can edit own messages"
  on public.chat_messages for update
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- Users can soft-delete their own messages
-- (we use update to set is_deleted = true, but also allow hard delete for admins)
create policy "Admins can delete any message"
  on public.chat_messages for delete
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'super_admin')
  );
