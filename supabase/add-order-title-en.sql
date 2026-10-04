-- Run once in the Supabase SQL Editor.
alter table public.orders
add column if not exists title_en text;