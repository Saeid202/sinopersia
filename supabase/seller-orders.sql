-- Run once in the Supabase SQL Editor, after seller-centre.sql.
-- Links shop checkout lines to the seller's product and lets that seller read only those lines.

alter table public.order_products
  add column if not exists shop_product_id uuid references public.shop_products(id) on delete set null;

alter table public.order_products
  add column if not exists quantity integer;

alter table public.order_products
  add column if not exists unit_price numeric(12, 2);

alter table public.order_products
  add column if not exists currency text;

create index if not exists order_products_shop_product_id_idx
  on public.order_products (shop_product_id);

update public.order_products as line
set
  shop_product_id = product.id,
  quantity = coalesce(
    line.quantity,
    nullif(substring(line.description from 'تعداد:\s*([0-9]+)'), '')::integer
  ),
  unit_price = coalesce(line.unit_price, product.price),
  currency = coalesce(line.currency, product.currency)
from public.shop_products as product
where line.shop_product_id is null
  and substring(line.description from 'شناسه:\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})') is not null
  and product.id = substring(line.description from 'شناسه:\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})')::uuid;

create or replace function public.seller_shop_order_lines()
returns table (
  order_id uuid,
  order_number text,
  status text,
  created_at timestamptz,
  line_id uuid,
  product_id uuid,
  title_en text,
  title_fa text,
  sku text,
  quantity integer,
  unit_price numeric,
  currency text,
  image_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    orders.id,
    orders.order_number::text,
    orders.status::text,
    orders.created_at,
    line.id,
    product.id,
    product.title_en,
    product.title_fa,
    coalesce(product.sku, line.part_number),
    line.quantity,
    line.unit_price,
    line.currency,
    product.image_url
  from public.order_products as line
  join public.orders on orders.id = line.order_id
  join public.shop_products as product on product.id = line.shop_product_id
  where product.seller_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'seller'
    );
$$;

revoke all on function public.seller_shop_order_lines() from public, anon, authenticated;
grant execute on function public.seller_shop_order_lines() to authenticated;
