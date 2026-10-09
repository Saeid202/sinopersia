-- Run once in the Supabase SQL Editor, after agent-role.sql and seller-centre.sql.
-- Categories are the list sellers pick from. Products keep the English name in shop_products.category.

create table if not exists public.shop_categories (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_fa text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint shop_categories_name_en_unique unique (name_en),
  constraint shop_categories_name_fa_unique unique (name_fa),
  constraint shop_categories_name_en_not_blank check (length(trim(name_en)) > 0),
  constraint shop_categories_name_fa_not_blank check (length(trim(name_fa)) > 0)
);

insert into public.shop_categories (name_en, name_fa, sort_order)
values
  ('Electronics', 'لوازم الکترونیکی', 1),
  ('Industrial Parts', 'قطعات صنعتی', 2),
  ('Auto Parts', 'قطعات خودرو', 3),
  ('Construction Equipment', 'تجهیزات ساختمانی', 4),
  ('Raw Materials', 'مواد اولیه', 5),
  ('Machinery', 'ماشین‌آلات', 6),
  ('Home Appliances', 'لوازم خانگی', 7),
  ('Clothing & Textiles', 'پوشاک و نساجی', 8),
  ('Other', 'سایر', 9),
  ('General', 'عمومی', 10)
on conflict (name_en) do nothing;

create or replace function public.rename_shop_category_products()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.name_en is distinct from old.name_en then
    update public.shop_products
    set category = new.name_en
    where category = old.name_en;
  end if;
  return new;
end;
$$;

drop trigger if exists rename_shop_category_products on public.shop_categories;
create trigger rename_shop_category_products
before update of name_en on public.shop_categories
for each row execute function public.rename_shop_category_products();

create or replace function public.prevent_shop_category_delete_in_use()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.shop_products where category = old.name_en) then
    raise exception 'این دسته‌بندی روی محصول‌ها استفاده شده است';
  end if;
  return old;
end;
$$;

drop trigger if exists prevent_shop_category_delete_in_use on public.shop_categories;
create trigger prevent_shop_category_delete_in_use
before delete on public.shop_categories
for each row execute function public.prevent_shop_category_delete_in_use();

alter table public.shop_categories enable row level security;
grant select on public.shop_categories to anon, authenticated;
grant insert, update, delete on public.shop_categories to authenticated;

drop policy if exists "Anyone can view shop categories" on public.shop_categories;
create policy "Anyone can view shop categories"
on public.shop_categories for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert shop categories" on public.shop_categories;
create policy "Admins can insert shop categories"
on public.shop_categories for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update shop categories" on public.shop_categories;
create policy "Admins can update shop categories"
on public.shop_categories for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete shop categories" on public.shop_categories;
create policy "Admins can delete shop categories"
on public.shop_categories for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins can view shop sellers" on public.shop_sellers;
create policy "Admins can view shop sellers"
on public.shop_sellers for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can view all shop products" on public.shop_products;
create policy "Admins can view all shop products"
on public.shop_products for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update shop products" on public.shop_products;
create policy "Admins can update shop products"
on public.shop_products for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete shop products" on public.shop_products;
create policy "Admins can delete shop products"
on public.shop_products for delete
to authenticated
using (public.is_admin());
