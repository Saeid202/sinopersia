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
using (public.is_agent() or public.is_admin() or id = auth.uid());

drop policy if exists "Admins can view all orders" on public.orders;
create policy "Admins can view all orders"
on public.orders for select
to authenticated
using (public.is_admin() or public.is_agent() or user_id = auth.uid());

drop policy if exists "Admins can update all orders" on public.orders;
create policy "Admins can update all orders"
on public.orders for update
to authenticated
using (public.is_admin() or public.is_agent() or user_id = auth.uid())
with check (public.is_admin() or public.is_agent() or user_id = auth.uid());

drop policy if exists "Admins can delete orders" on public.orders;
create policy "Admins can delete orders"
on public.orders for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins can view all order products" on public.order_products;
create policy "Admins can view all order products"
on public.order_products for select
to authenticated
using (public.is_admin() or public.is_agent() or exists (
  select 1 from public.orders where orders.id = order_products.order_id and orders.user_id = auth.uid()
));

drop policy if exists "Agents can view all orders" on public.orders;
create policy "Agents can view all orders"
on public.orders for select
to authenticated
using (public.is_agent() or user_id = auth.uid());

drop policy if exists "Agents can update all orders" on public.orders;
create policy "Agents can update all orders"
on public.orders for update
to authenticated
using (public.is_agent() or user_id = auth.uid())
with check (public.is_agent() or user_id = auth.uid());

drop policy if exists "Agents can view all order products" on public.order_products;
create policy "Agents can view all order products"
on public.order_products for select
to authenticated
using (
  public.is_agent()
  or exists (
    select 1 from public.orders
    where orders.id = order_products.order_id and orders.user_id = auth.uid()
  )
);

drop policy if exists "Agents can send order messages" on public.agent_messages;
create policy "Agents can send order messages"
on public.agent_messages for insert
to authenticated
with check (public.is_agent());

drop policy if exists "Customers can read their order messages" on public.agent_messages;
create policy "Customers can read their order messages"
on public.agent_messages for select
to authenticated
using (user_id = auth.uid() or public.is_agent());

alter table public.order_comments enable row level security;

drop policy if exists "Customers and staff can read order chat" on public.order_comments;
create policy "Customers and staff can read order chat"
on public.order_comments for select
to authenticated
using (
  public.is_admin()
  or public.is_agent()
  or exists (
    select 1 from public.orders
    where orders.id = order_comments.order_id and orders.user_id = auth.uid()
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
  and (public.is_agent() or public.is_admin())
);

alter table public.order_comments replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.order_comments;
exception
  when duplicate_object then null;
end
$$;
