-- Run once in the Supabase SQL Editor, after seller-centre.sql.
-- Stores the market rate used when a product is saved. The shop still shows the current rate from the shared cache.

alter table public.shop_products
  add column if not exists fx_rate_irr numeric(14, 2),
  add column if not exists price_irr bigint,
  add column if not exists fx_quoted_at timestamptz;

create or replace function public.apply_shop_product_rial(
  seller_id_input uuid,
  product_ids uuid[],
  usd_rate numeric,
  cny_rate numeric,
  usd_quoted_at timestamptz,
  cny_quoted_at timestamptz,
  missing_only boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.shop_products
  set
    fx_rate_irr = case currency when 'USD' then usd_rate else cny_rate end,
    price_irr = round(price * case currency when 'USD' then usd_rate else cny_rate end)::bigint,
    fx_quoted_at = case currency when 'USD' then usd_quoted_at else cny_quoted_at end
  where seller_id = seller_id_input
    and (product_ids is null or id = any(product_ids))
    and (not missing_only or price_irr is null);
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.apply_shop_product_rial(uuid, uuid[], numeric, numeric, timestamptz, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.apply_shop_product_rial(uuid, uuid[], numeric, numeric, timestamptz, timestamptz, boolean) to service_role;
