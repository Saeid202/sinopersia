-- Run after agent-role.sql in the Supabase SQL Editor.
create table if not exists public.shop_sellers (
  id uuid primary key references auth.users(id) on delete cascade,
  store_name text not null check (length(trim(store_name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.shop_sellers(id) on delete cascade,
  category text not null default 'General',
  sku text,
  title_en text not null check (length(trim(title_en)) > 0),
  title_fa text,
  description_en text,
  description_fa text,
  price numeric(12, 2) not null check (price > 0),
  currency text not null default 'CNY' check (currency in ('CNY', 'USD')),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  role_constraint record;
begin
  for role_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', role_constraint.conname);
  end loop;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('customer', 'agent', 'admin', 'seller'));
end;
$$;

create index if not exists shop_products_seller_created_idx
on public.shop_products (seller_id, created_at desc);

create or replace function public.create_shop_seller_from_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'account_type' = 'seller' then
    insert into public.shop_sellers (id, store_name)
    values (new.id, trim(coalesce(new.raw_user_meta_data ->> 'store_name', '')));
    update public.profiles set role = 'seller' where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_shop_seller on auth.users;
create trigger on_auth_user_created_shop_seller
after insert on auth.users
for each row execute function public.create_shop_seller_from_signup();

create or replace function public.set_shop_seller_role_on_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'customer' and exists (
    select 1 from public.shop_sellers where id = new.id
  ) then
    new.role = 'seller';
  end if;
  return new;
end;
$$;

drop trigger if exists set_shop_seller_role_on_profile_insert on public.profiles;
create trigger set_shop_seller_role_on_profile_insert
before insert on public.profiles
for each row execute function public.set_shop_seller_role_on_profile_insert();

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
      return new;
    end if;
    if new.role = 'seller'
      and old.id = auth.uid()
      and old.role = 'customer'
      and exists (select 1 from public.shop_sellers where id = old.id) then
      return new;
    end if;
    raise exception 'Only administrators can change user roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update on public.profiles
for each row execute function public.prevent_profile_role_change();

create or replace function public.ensure_shop_seller_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'seller' then
    insert into public.shop_sellers (id, store_name)
    values (
      new.id,
      coalesce(nullif(trim(new.full_name), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Seller store')
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists create_shop_seller_after_profile_insert on public.profiles;
create trigger create_shop_seller_after_profile_insert
after insert on public.profiles
for each row execute function public.ensure_shop_seller_profile();

drop trigger if exists create_shop_seller_after_role_change on public.profiles;
create trigger create_shop_seller_after_role_change
after update of role on public.profiles
for each row execute function public.ensure_shop_seller_profile();

update public.profiles
set role = 'seller'
where role = 'customer'
  and exists (select 1 from public.shop_sellers where id = public.profiles.id);

create or replace function public.create_shop_seller_profile(store_name_input text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role text;
begin
  if auth.uid() is null then
    raise exception 'Sign in before creating a seller profile';
  end if;
  if length(trim(coalesce(store_name_input, ''))) = 0 then
    raise exception 'A store name is required';
  end if;
  select role into current_role from public.profiles where id = auth.uid();
  if current_role is null or current_role not in ('customer', 'seller') then
    raise exception 'Only customer accounts can become sellers';
  end if;

  insert into public.shop_sellers (id, store_name)
  values (auth.uid(), trim(store_name_input))
  on conflict (id) do update set store_name = excluded.store_name;

  update public.profiles set role = 'seller' where id = auth.uid() and role = 'customer';
end;
$$;

revoke all on function public.create_shop_seller_profile(text) from public;
grant execute on function public.create_shop_seller_profile(text) to authenticated;

create or replace function public.set_shop_product_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_shop_seller()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'seller'
  );
$$;

revoke all on function public.is_shop_seller() from public;
grant execute on function public.is_shop_seller() to anon, authenticated;

drop trigger if exists set_shop_product_updated_at on public.shop_products;
create trigger set_shop_product_updated_at
before update on public.shop_products
for each row execute function public.set_shop_product_updated_at();

alter table public.shop_sellers enable row level security;
alter table public.shop_products enable row level security;

grant select on public.shop_sellers to authenticated;
grant update (store_name) on public.shop_sellers to authenticated;
grant select on public.shop_products to anon, authenticated;
grant insert, update, delete on public.shop_products to authenticated;

drop policy if exists "Sellers can view own shop profile" on public.shop_sellers;
create policy "Sellers can view own shop profile"
on public.shop_sellers for select
to authenticated
using (id = (select auth.uid()) and public.is_shop_seller());

drop policy if exists "Sellers can update own store name" on public.shop_sellers;
create policy "Sellers can update own store name"
on public.shop_sellers for update
to authenticated
using (id = (select auth.uid()) and public.is_shop_seller())
with check (id = (select auth.uid()) and public.is_shop_seller());

drop policy if exists "Public can view active shop products" on public.shop_products;
create policy "Public can view active shop products"
on public.shop_products for select
to anon, authenticated
using (is_active or (seller_id = (select auth.uid()) and public.is_shop_seller()));

drop policy if exists "Sellers can create own shop products" on public.shop_products;
create policy "Sellers can create own shop products"
on public.shop_products for insert
to authenticated
with check (
  seller_id = (select auth.uid())
  and public.is_shop_seller()
  and exists (select 1 from public.shop_sellers where id = (select auth.uid()))
);

drop policy if exists "Sellers can update own shop products" on public.shop_products;
create policy "Sellers can update own shop products"
on public.shop_products for update
to authenticated
using (seller_id = (select auth.uid()))
with check (
  seller_id = (select auth.uid())
  and public.is_shop_seller()
  and exists (select 1 from public.shop_sellers where id = (select auth.uid()))
);

drop policy if exists "Sellers can delete own shop products" on public.shop_products;
create policy "Sellers can delete own shop products"
on public.shop_products for delete
to authenticated
using (seller_id = (select auth.uid()) and public.is_shop_seller());

insert into storage.buckets (id, name, public)
values ('shop-product-images', 'shop-product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Anyone can view shop product images" on storage.objects;
create policy "Anyone can view shop product images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'shop-product-images');

drop policy if exists "Sellers can upload own shop product images" on storage.objects;
create policy "Sellers can upload own shop product images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'shop-product-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_shop_seller()
  and exists (select 1 from public.shop_sellers where id = (select auth.uid()))
);

drop policy if exists "Sellers can update own shop product images" on storage.objects;
create policy "Sellers can update own shop product images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'shop-product-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_shop_seller()
)
with check (
  bucket_id = 'shop-product-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_shop_seller()
  and exists (select 1 from public.shop_sellers where id = (select auth.uid()))
);

drop policy if exists "Sellers can delete own shop product images" on storage.objects;
create policy "Sellers can delete own shop product images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'shop-product-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_shop_seller()
);

alter table public.shop_products
add column if not exists category text not null default 'General';