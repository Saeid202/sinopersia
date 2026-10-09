-- Run once in the Supabase SQL Editor, after agent-role.sql.
-- Visitors can submit a message. Only administrators can read or mark it as read.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  status text not null default 'جدید' check (status in ('جدید', 'خوانده‌شده')),
  created_at timestamptz not null default now(),
  constraint contact_messages_name_length check (char_length(name) between 2 and 80),
  constraint contact_messages_email_length check (char_length(email) between 5 and 160 and position('@' in email) > 1),
  constraint contact_messages_phone_length check (phone is null or char_length(phone) between 6 and 30),
  constraint contact_messages_message_length check (char_length(message) between 10 and 2000)
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

create or replace function public.protect_contact_message_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.id := gen_random_uuid();
  new.status := 'جدید';
  new.created_at := now();
  new.name := trim(new.name);
  new.email := lower(trim(new.email));
  new.message := trim(new.message);
  new.phone := nullif(trim(coalesce(new.phone, '')), '');
  return new;
end;
$$;

drop trigger if exists protect_contact_message_insert on public.contact_messages;
create trigger protect_contact_message_insert
before insert on public.contact_messages
for each row execute function public.protect_contact_message_insert();

create or replace function public.protect_contact_message_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can update contact messages';
  end if;

  new.id := old.id;
  new.name := old.name;
  new.email := old.email;
  new.phone := old.phone;
  new.message := old.message;
  new.created_at := old.created_at;

  if new.status not in ('جدید', 'خوانده‌شده') then
    raise exception 'Invalid contact message status';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_contact_message_update on public.contact_messages;
create trigger protect_contact_message_update
before update on public.contact_messages
for each row execute function public.protect_contact_message_update();

alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can send a contact message" on public.contact_messages;
create policy "Anyone can send a contact message"
on public.contact_messages for insert
to anon, authenticated
with check (status = 'جدید');

drop policy if exists "Admins can view contact messages" on public.contact_messages;
create policy "Admins can view contact messages"
on public.contact_messages for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update contact messages" on public.contact_messages;
create policy "Admins can update contact messages"
on public.contact_messages for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke all on table public.contact_messages from public, anon, authenticated;
grant insert on table public.contact_messages to anon, authenticated;
grant select, update on table public.contact_messages to authenticated;
