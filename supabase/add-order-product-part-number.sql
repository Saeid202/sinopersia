-- Run once in the Supabase SQL Editor.
alter table public.order_products
add column if not exists part_number text;