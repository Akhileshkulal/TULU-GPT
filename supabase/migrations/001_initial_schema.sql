-- TULU-GPT Initial Database Schema & Row Level Security
-- Run this migration in your Supabase SQL Editor or via `supabase db push`.

-- 1. Chats table
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chats_user_id_updated_at_idx
  on public.chats (user_id, updated_at desc);

-- 2. Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_chat_id_created_at_idx
  on public.messages (chat_id, created_at asc);

create index if not exists messages_user_id_created_at_idx
  on public.messages (user_id, created_at desc);

-- 3. Automatic updated_at maintenance
create or replace function public.set_chat_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chats_set_updated_at on public.chats;
create trigger chats_set_updated_at
  before update on public.chats
  for each row
  execute function public.set_chat_updated_at();

create or replace function public.touch_chat_on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chats
  set updated_at = now()
  where id = new.chat_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_chat on public.messages;
create trigger messages_touch_chat
  after insert on public.messages
  for each row
  execute function public.touch_chat_on_message_insert();

-- 4. Row Level Security (RLS)
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- Chats policies
drop policy if exists "Users can view their own chats" on public.chats;
create policy "Users can view their own chats"
  on public.chats
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own chats" on public.chats;
create policy "Users can create their own chats"
  on public.chats
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own chats" on public.chats;
create policy "Users can update their own chats"
  on public.chats
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own chats" on public.chats;
create policy "Users can delete their own chats"
  on public.chats
  for delete
  using (auth.uid() = user_id);

-- Messages policies (require both user_id match and chat ownership)
drop policy if exists "Users can view messages in their own chats" on public.messages;
create policy "Users can view messages in their own chats"
  on public.messages
  for select
  using (
    exists (
      select 1
      from public.chats c
      where c.id = messages.chat_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert messages into their own chats" on public.messages;
create policy "Users can insert messages into their own chats"
  on public.messages
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.chats c
      where c.id = messages.chat_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete messages in their own chats" on public.messages;
create policy "Users can delete messages in their own chats"
  on public.messages
  for delete
  using (
    exists (
      select 1
      from public.chats c
      where c.id = messages.chat_id
        and c.user_id = auth.uid()
    )
  );
