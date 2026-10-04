-- Run this once in Supabase SQL Editor.
-- Afterward, promote the intended account with:
-- update public.profiles set role = 'agent' where email = 'agent@example.com';
-- Set the first administrator before using /admin:
-- update public.profiles set role = 'admin' where email = 'admin@example.com';
-- The admin creation API also requires SUPABASE_SERVICE_ROLE_KEY in .env.local.

create or replace function public.is_agent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'agent'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.orders
add column if not exists assigned_agent_id uuid references public.profiles(id) on delete set null;

create or replace function public.assign_order_agent(order_id_input uuid, agent_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can assign orders';
  end if;

  if agent_id_input is not null and not exists (
    select 1 from public.profiles where id = agent_id_input and role = 'agent'
  ) then
    raise exception 'The selected account is not an agent';
  end if;

  update public.orders set assigned_agent_id = agent_id_input where id = order_id_input;
  if not found then
    raise exception 'Order not found';
  end if;
end;
$$;

revoke all on function public.assign_order_agent(uuid, uuid) from public;
grant execute on function public.assign_order_agent(uuid, uuid) to authenticated;

create or replace function public.prevent_order_agent_reassignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' and new.assigned_agent_id is not null then
      raise exception 'Only administrators can assign orders';
    elsif tg_op = 'UPDATE' and new.assigned_agent_id is distinct from old.assigned_agent_id then
      raise exception 'Only administrators can change order assignment';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_order_agent_assignment on public.orders;
create trigger protect_order_agent_assignment
before insert or update on public.orders
for each row execute function public.prevent_order_agent_reassignment();

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only administrators can change user roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update on public.profiles
for each row execute function public.prevent_profile_role_change();

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_products enable row level security;
alter table public.agent_messages enable row level security;

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
on public.profiles for select
to authenticated
using (public.is_admin() or id = auth.uid());

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles"
on public.profiles for update
to authenticated
using (public.is_admin() or id = auth.uid())
with check (public.is_admin() or id = auth.uid());

drop policy if exists "Agents can view customer profiles" on public.profiles;
create policy "Agents can view customer profiles"
on public.profiles for select
to authenticated
using (
  public.is_agent()
  and exists (
    select 1 from public.orders
    where orders.user_id = profiles.id and orders.assigned_agent_id = auth.uid()
  )
);

drop policy if exists "Admins can view all orders" on public.orders;
create policy "Admins can view all orders"
on public.orders for select
to authenticated
using (public.is_admin() or user_id = auth.uid() or (public.is_agent() and assigned_agent_id = auth.uid()));

drop policy if exists "Customers can create own orders" on public.orders;
create policy "Customers can create own orders"
on public.orders for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Admins can update all orders" on public.orders;
create policy "Admins can update all orders"
on public.orders for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Agents can update assigned orders" on public.orders;
create policy "Agents can update assigned orders"
on public.orders for update
to authenticated
using (public.is_agent() and assigned_agent_id = auth.uid())
with check (public.is_agent() and assigned_agent_id = auth.uid());

drop policy if exists "Customers can update own orders" on public.orders;
create policy "Customers can update own orders"
on public.orders for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Admins can delete orders" on public.orders;
create policy "Admins can delete orders"
on public.orders for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins can view all order products" on public.order_products;
create policy "Admins can view all order products"
on public.order_products for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.orders
    where orders.id = order_products.order_id
      and (orders.user_id = auth.uid() or (public.is_agent() and orders.assigned_agent_id = auth.uid()))
  )
);

drop policy if exists "Agents can view all orders" on public.orders;
drop policy if exists "Agents can update all orders" on public.orders;

drop policy if exists "Agents can view all order products" on public.order_products;

drop policy if exists "Customers can create own order products" on public.order_products;
create policy "Customers can create own order products"
on public.order_products for insert
to authenticated
with check (exists (
  select 1 from public.orders where orders.id = order_products.order_id and orders.user_id = auth.uid()
));

drop policy if exists "Customers can delete own order products" on public.order_products;
create policy "Customers can delete own order products"
on public.order_products for delete
to authenticated
using (exists (
  select 1 from public.orders where orders.id = order_products.order_id and orders.user_id = auth.uid()
));

create table if not exists public.order_chat_reads (
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (order_id, user_id)
);

alter table public.order_comments enable row level security;
alter table public.order_chat_reads enable row level security;

create index if not exists orders_assigned_agent_id_idx on public.orders(assigned_agent_id);
create index if not exists order_comments_order_author_created_idx on public.order_comments(order_id, author_type, created_at);
create index if not exists order_chat_reads_user_order_idx on public.order_chat_reads(user_id, order_id);

grant select, insert, update on public.order_chat_reads to authenticated;

drop policy if exists "Agents can send order messages" on public.agent_messages;
create policy "Agents can send order messages"
on public.agent_messages for insert
to authenticated
with check (
  user_id = (select user_id from public.orders where id = agent_messages.order_id)
  and exists (
    select 1 from public.orders
    where orders.id = agent_messages.order_id
      and (public.is_admin() or (public.is_agent() and orders.assigned_agent_id = auth.uid()))
  )
);

drop policy if exists "Customers can read their order messages" on public.agent_messages;
create policy "Customers can read their order messages"
on public.agent_messages for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.orders
    where orders.id = agent_messages.order_id
      and public.is_agent()
      and orders.assigned_agent_id = auth.uid()
  )
);

alter table public.order_comments enable row level security;

drop policy if exists "Customers and staff can read order chat" on public.order_comments;
create policy "Customers and staff can read order chat"
on public.order_comments for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.orders
    where orders.id = order_comments.order_id
      and (orders.user_id = auth.uid() or (public.is_agent() and orders.assigned_agent_id = auth.uid()))
  )
);

drop policy if exists "Customers can send order chat messages" on public.order_comments;
create policy "Customers can send order chat messages"
on public.order_comments for insert
to authenticated
with check (
  author_type = 'customer'
  and user_id = auth.uid()
  and exists (
    select 1 from public.orders
    where orders.id = order_comments.order_id and orders.user_id = auth.uid()
  )
);

drop policy if exists "Staff can send order chat messages" on public.order_comments;
create policy "Staff can send order chat messages"
on public.order_comments for insert
to authenticated
with check (
  author_type = 'agent'
  and user_id = auth.uid()
  and exists (
    select 1 from public.orders
    where orders.id = order_comments.order_id
      and (public.is_admin() or (public.is_agent() and orders.assigned_agent_id = auth.uid()))
  )
);

drop policy if exists "Order participants can view chat read markers" on public.order_chat_reads;
create policy "Order participants can view chat read markers"
on public.order_chat_reads for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.orders
    where orders.id = order_chat_reads.order_id
      and (orders.user_id = auth.uid() or (public.is_agent() and orders.assigned_agent_id = auth.uid()))
  )
);

drop policy if exists "Users can mark own order chats read" on public.order_chat_reads;
create policy "Users can mark own order chats read"
on public.order_chat_reads for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.orders
    where orders.id = order_chat_reads.order_id
      and (public.is_admin() or orders.user_id = auth.uid() or (public.is_agent() and orders.assigned_agent_id = auth.uid()))
  )
);

drop policy if exists "Users can update own order chat reads" on public.order_chat_reads;
create policy "Users can update own order chat reads"
on public.order_chat_reads for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.orders
    where orders.id = order_chat_reads.order_id
      and (public.is_admin() or orders.user_id = auth.uid() or (public.is_agent() and orders.assigned_agent_id = auth.uid()))
  )
);

create or replace function public.mark_order_chat_read(order_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.orders
    where id = order_id_input
      and (public.is_admin() or user_id = auth.uid() or (public.is_agent() and assigned_agent_id = auth.uid()))
  ) then
    raise exception 'Not authorized to read this order chat';
  end if;

  insert into public.order_chat_reads (order_id, user_id, last_read_at)
  values (order_id_input, auth.uid(), now())
  on conflict (order_id, user_id)
  do update set last_read_at = greatest(public.order_chat_reads.last_read_at, excluded.last_read_at);
end;
$$;

revoke all on function public.mark_order_chat_read(uuid) from public;
grant execute on function public.mark_order_chat_read(uuid) to authenticated;

drop policy if exists "Order participants can receive chat realtime" on realtime.messages;
create policy "Order participants can receive chat realtime"
on realtime.messages for select
to authenticated
using (
  extension in ('broadcast', 'presence')
  and (
    realtime.topic() = 'chat-inbox:' || auth.uid()::text
    or exists (
      select 1 from public.orders
      where orders.id::text = split_part(realtime.topic(), ':', 2)
        and (public.is_admin() or orders.user_id = auth.uid() or (public.is_agent() and orders.assigned_agent_id = auth.uid()))
    )
  )
);

drop policy if exists "Order participants can send chat realtime" on realtime.messages;
create policy "Order participants can send chat realtime"
on realtime.messages for insert
to authenticated
with check (
  extension in ('broadcast', 'presence')
  and exists (
    select 1 from public.orders
    where orders.id::text = split_part(realtime.topic(), ':', 2)
      and (public.is_admin() or orders.user_id = auth.uid() or (public.is_agent() and orders.assigned_agent_id = auth.uid()))
  )
);

alter table public.order_comments replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.order_comments;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.order_chat_reads;
exception
  when duplicate_object then null;
end
$$;
