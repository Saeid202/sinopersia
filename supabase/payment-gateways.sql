-- Run once in the Supabase SQL Editor.
-- Payment gateway settings stay on the server. The admin panel reads them through the admin API.

create table if not exists public.payment_gateways (
  code text primary key,
  name text not null,
  enabled boolean not null default false,
  sandbox boolean not null default true,
  credentials jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  gateway_code text not null references public.payment_gateways(code),
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  amount bigint not null check (amount > 0),
  currency text not null default 'IRR' check (currency in ('IRR', 'IRT')),
  status text not null default 'pending' check (status in ('pending', 'failed', 'cancelled', 'verified', 'paid')),
  authority text,
  reference_id text,
  gateway_order_id text,
  sandbox boolean not null default false,
  card_pan text,
  message text,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create unique index if not exists payment_transactions_authority_idx
  on public.payment_transactions (gateway_code, authority)
  where authority is not null;

create index if not exists payment_transactions_created_at_idx
  on public.payment_transactions (created_at desc);

create sequence if not exists public.payment_gateway_order_seq;

create or replace function public.next_payment_order_id()
returns bigint
language sql
security definer
set search_path = public
as $$
  select nextval('public.payment_gateway_order_seq');
$$;

revoke all on function public.next_payment_order_id() from public, anon, authenticated;
grant execute on function public.next_payment_order_id() to service_role;

insert into public.payment_gateways (code, name, enabled, sandbox)
values
  ('zarinpal', 'زرین‌پال', false, true),
  ('mellat', 'بانک ملت', false, true)
on conflict (code) do nothing;

alter table public.payment_gateways enable row level security;
alter table public.payment_transactions enable row level security;

revoke all on table public.payment_gateways from public, anon, authenticated;
revoke all on table public.payment_transactions from public, anon, authenticated;
