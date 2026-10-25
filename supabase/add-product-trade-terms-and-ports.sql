-- Run after seller-centre.sql and product-pdf-imports.sql in the Supabase SQL Editor.
-- Existing products and import drafts receive defaults for trade terms, unit, and MOQ.

alter table public.shop_products
  add column if not exists term text not null default 'FOB',
  add column if not exists port text not null default 'Shanghai',
  add column if not exists unit text not null default 'Unit',
  add column if not exists moq integer not null default 1 check (moq >= 1);

alter table public.shop_product_import_items
  add column if not exists term text not null default 'FOB',
  add column if not exists port text not null default 'Shanghai',
  add column if not exists unit text not null default 'Unit',
  add column if not exists moq integer not null default 1 check (moq >= 1);

update public.shop_products set term = 'CRF' where term = 'RFC';
update public.shop_product_import_items set term = 'CRF' where term = 'RFC';

-- Steel category (skipped if shop-categories.sql has not been run yet)
do $$
begin
  if to_regclass('public.shop_categories') is not null then
    insert into public.shop_categories (name_en, name_fa, sort_order)
    values ('Steel', 'فولاد', 11)
    on conflict (name_en) do nothing;
  end if;
end $$;

grant update (term, port, unit, moq)
on public.shop_product_import_items to authenticated;

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
    and length(trim(term)) > 0
    and length(trim(port)) > 0
    and price is not null
    and currency is not null
    and length(trim(unit)) > 0
    and unit <> 'Other'
    and moq >= 1
    and stock is not null;

  if valid_count <> selected_count then
    raise exception 'Every selected product needs an English name, category, term, port, price, currency, unit, MOQ, and stock value';
  end if;

  insert into public.shop_products (
    seller_id, category, term, port, sku, title_en, title_fa, description_en, description_fa, unit, moq,
    price, currency, stock, image_url, is_active
  )
  select
    seller_id_value, category, term, port, sku, trim(title_en), nullif(trim(title_fa), ''),
    nullif(trim(description_en), ''), nullif(trim(description_fa), ''), unit, moq,
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
