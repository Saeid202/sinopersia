-- Run after seller-centre.sql in the Supabase SQL Editor.
-- Product data extracted from PDFs remains private until a seller explicitly approves it.

create table if not exists public.shop_product_imports (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.shop_sellers(id) on delete cascade,
  source_filename text not null,
  storage_path text not null,
  status text not null default 'needs_review'
    check (status in ('needs_review', 'completed')),
  page_count integer not null check (page_count > 0),
  item_count integer not null check (item_count >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.shop_product_import_items (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.shop_product_imports(id) on delete cascade,
  seller_id uuid not null references public.shop_sellers(id) on delete cascade,
  source_page integer not null check (source_page > 0),
  raw_text text not null,
  extraction_note text not null default '',
  title_en text not null default '',
  title_fa text,
  category text not null default 'Other',
  sku text,
  description_en text,
  description_fa text,
  price numeric(12, 2) check (price is null or price > 0),
  currency text check (currency is null or currency in ('CNY', 'USD')),
  stock integer check (stock is null or stock >= 0),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists shop_product_imports_seller_created_idx
on public.shop_product_imports (seller_id, created_at desc);

create index if not exists shop_product_import_items_import_status_idx
on public.shop_product_import_items (import_id, review_status);

alter table public.shop_product_imports enable row level security;
alter table public.shop_product_import_items enable row level security;

grant select, insert, delete on public.shop_product_imports to authenticated;
grant select, insert on public.shop_product_import_items to authenticated;
grant update (title_en, title_fa, category, sku, description_en, description_fa, price, currency, stock)
on public.shop_product_import_items to authenticated;

drop policy if exists "Sellers can view own product imports" on public.shop_product_imports;
create policy "Sellers can view own product imports"
on public.shop_product_imports for select to authenticated
using (seller_id = (select auth.uid()) and public.is_shop_seller());

drop policy if exists "Sellers can create own product imports" on public.shop_product_imports;
create policy "Sellers can create own product imports"
on public.shop_product_imports for insert to authenticated
with check (seller_id = (select auth.uid()) and public.is_shop_seller());

drop policy if exists "Sellers can remove own product imports" on public.shop_product_imports;
create policy "Sellers can remove own product imports"
on public.shop_product_imports for delete to authenticated
using (seller_id = (select auth.uid()) and public.is_shop_seller());

drop policy if exists "Sellers can view own imported product drafts" on public.shop_product_import_items;
create policy "Sellers can view own imported product drafts"
on public.shop_product_import_items for select to authenticated
using (
  seller_id = (select auth.uid())
  and public.is_shop_seller()
  and exists (
    select 1 from public.shop_product_imports i
    where i.id = import_id and i.seller_id = (select auth.uid())
  )
);

drop policy if exists "Sellers can add own imported product drafts" on public.shop_product_import_items;
create policy "Sellers can add own imported product drafts"
on public.shop_product_import_items for insert to authenticated
with check (
  seller_id = (select auth.uid())
  and public.is_shop_seller()
  and exists (
    select 1 from public.shop_product_imports i
    where i.id = import_id and i.seller_id = (select auth.uid())
  )
);

drop policy if exists "Sellers can edit pending imported product drafts" on public.shop_product_import_items;
create policy "Sellers can edit pending imported product drafts"
on public.shop_product_import_items for update to authenticated
using (
  seller_id = (select auth.uid())
  and review_status = 'pending'
  and public.is_shop_seller()
)
with check (
  seller_id = (select auth.uid())
  and review_status = 'pending'
  and public.is_shop_seller()
);

drop policy if exists "Sellers can reject pending imported product drafts" on public.shop_product_import_items;
create policy "Sellers can reject pending imported product drafts"
on public.shop_product_import_items for delete to authenticated
using (
  seller_id = (select auth.uid())
  and review_status = 'pending'
  and public.is_shop_seller()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-product-imports', 'shop-product-imports', false, 12582912, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Sellers can upload own product import PDFs" on storage.objects;
create policy "Sellers can upload own product import PDFs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'shop-product-imports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_shop_seller()
);

drop policy if exists "Sellers can view own product import PDFs" on storage.objects;
create policy "Sellers can view own product import PDFs"
on storage.objects for select to authenticated
using (
  bucket_id = 'shop-product-imports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_shop_seller()
);

drop policy if exists "Sellers can remove own product import PDFs" on storage.objects;
create policy "Sellers can remove own product import PDFs"
on storage.objects for delete to authenticated
using (
  bucket_id = 'shop-product-imports'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_shop_seller()
);

create or replace function public.approve_shop_product_import_items(
  import_id_input uuid,
  item_ids_input uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  seller_id_value uuid := auth.uid();
  selected_count integer;
  valid_count integer;
  published_count integer;
begin
  if seller_id_value is null or not public.is_shop_seller() then
    raise exception 'Only authenticated sellers can approve imported products';
  end if;
  if coalesce(cardinality(item_ids_input), 0) = 0 then
    raise exception 'Select at least one product to publish';
  end if;
  perform 1
  from public.shop_product_imports
  where id = import_id_input
    and seller_id = seller_id_value
    and status = 'needs_review'
  for update;

  if not found then
    raise exception 'Product import not found or already completed';
  end if;

  select count(*) into selected_count
  from public.shop_product_import_items
  where import_id = import_id_input
    and seller_id = seller_id_value
    and id = any(item_ids_input)
    and review_status = 'pending';

  if selected_count <> cardinality(item_ids_input) then
    raise exception 'One or more selected product drafts are unavailable';
  end if;

  select count(*) into valid_count
  from public.shop_product_import_items
  where import_id = import_id_input
    and seller_id = seller_id_value
    and id = any(item_ids_input)
    and review_status = 'pending'
    and length(trim(title_en)) > 0
    and length(trim(category)) > 0
    and price is not null
    and currency is not null
    and stock is not null;

  if valid_count <> selected_count then
    raise exception 'Every selected product needs an English name, category, price, currency, and stock value';
  end if;

  insert into public.shop_products (
    seller_id, category, sku, title_en, title_fa, description_en, description_fa,
    price, currency, stock, image_url, is_active
  )
  select
    seller_id_value, category, sku, trim(title_en), nullif(trim(title_fa), ''),
    nullif(trim(description_en), ''), nullif(trim(description_fa), ''),
    price, currency, stock, null, true
  from public.shop_product_import_items
  where import_id = import_id_input
    and seller_id = seller_id_value
    and id = any(item_ids_input)
    and review_status = 'pending';

  get diagnostics published_count = row_count;

  update public.shop_product_import_items
  set review_status = 'approved'
  where import_id = import_id_input
    and seller_id = seller_id_value
    and id = any(item_ids_input)
    and review_status = 'pending';

  update public.shop_product_imports
  set status = 'completed', completed_at = now()
  where id = import_id_input
    and seller_id = seller_id_value
    and not exists (
      select 1 from public.shop_product_import_items
      where import_id = import_id_input and review_status = 'pending'
    );

  return published_count;
end;
$$;

revoke all on function public.approve_shop_product_import_items(uuid, uuid[]) from public;
grant execute on function public.approve_shop_product_import_items(uuid, uuid[]) to authenticated;

create or replace function public.reject_shop_product_import_item(item_id_input uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  seller_id_value uuid := auth.uid();
  import_id_value uuid;
begin
  if seller_id_value is null or not public.is_shop_seller() then
    raise exception 'Only authenticated sellers can reject imported products';
  end if;

  select import_id into import_id_value
  from public.shop_product_import_items
  where id = item_id_input
    and seller_id = seller_id_value
    and review_status = 'pending';

  if import_id_value is null then
    raise exception 'Pending product draft not found';
  end if;

  perform 1
  from public.shop_product_imports
  where id = import_id_value
    and seller_id = seller_id_value
    and status = 'needs_review'
  for update;

  if not found then
    raise exception 'Product import not found or already completed';
  end if;

  update public.shop_product_import_items
  set review_status = 'rejected'
  where id = item_id_input
    and seller_id = seller_id_value
    and review_status = 'pending'
  returning import_id into import_id_value;

  if import_id_value is null then
    raise exception 'Pending product draft not found';
  end if;

  update public.shop_product_imports
  set status = 'completed', completed_at = now()
  where id = import_id_value
    and seller_id = seller_id_value
    and not exists (
      select 1 from public.shop_product_import_items
      where import_id = import_id_value and review_status = 'pending'
    );
end;
$$;

revoke all on function public.reject_shop_product_import_item(uuid) from public;
grant execute on function public.reject_shop_product_import_item(uuid) to authenticated;
