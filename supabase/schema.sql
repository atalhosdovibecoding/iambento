begin;

create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  name text,
  cpf text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id text primary key,
  name text not null,
  amount_cents integer not null check (amount_cents > 0),
  duration_days integer not null check (duration_days > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  plan_id text not null references public.plans(id),
  sync_identifier text unique,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  amount_cents integer not null check (amount_cents > 0),
  pix_code text,
  raw_gateway_response jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  sync_identifier text,
  event_header text,
  status text,
  payload_hash text not null unique,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid unique references public.orders(id) on delete set null,
  plan_id text not null references public.plans(id),
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memberships_user_active_idx
  on public.memberships (user_id, status, expires_at);

create index if not exists memberships_customer_active_idx
  on public.memberships (customer_id, status, expires_at);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  storage_path text not null unique,
  thumbnail_path text,
  content_type text not null default 'image',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_items
  add column if not exists thumbnail_path text;

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  membership_id uuid references public.memberships(id) on delete set null,
  content_item_id uuid references public.content_items(id) on delete set null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists memberships_set_updated_at on public.memberships;
create trigger memberships_set_updated_at
before update on public.memberships
for each row execute function public.set_updated_at();

drop trigger if exists content_items_set_updated_at on public.content_items;
create trigger content_items_set_updated_at
before update on public.content_items
for each row execute function public.set_updated_at();

insert into public.plans (id, name, amount_cents, duration_days, active)
values
  ('vip', 'Acesso privado', 3000, 30, true)
on conflict (id) do update set
  name = excluded.name,
  amount_cents = excluded.amount_cents,
  duration_days = excluded.duration_days,
  active = excluded.active;

update public.plans
set active = false
where id <> 'vip';

insert into public.content_items (title, description, storage_path, thumbnail_path, content_type, sort_order, active)
values
  ('Espelho quente', 'Registro privado liberado para membros.', 'previews/bathroom-black.jpg', null, 'image', 10, true),
  ('Depois do treino', 'Registro privado liberado para membros.', 'previews/gym-white.png', null, 'image', 20, true),
  ('Espelho escuro', 'Registro privado liberado para membros.', 'previews/locker-black.png', null, 'image', 30, true),
  ('Na cama', 'Registro privado liberado para membros.', 'previews/bed-selfie.png', null, 'image', 40, true),
  ('Cama quente', 'Registro privado liberado para membros.', 'previews/bed-close.png', null, 'image', 50, true),
  ('Banho reservado', 'Registro privado liberado para membros.', 'previews/bathroom-green.png', null, 'image', 60, true)
on conflict (storage_path) do update set
  title = excluded.title,
  description = excluded.description,
  thumbnail_path = excluded.thumbnail_path,
  content_type = excluded.content_type,
  sort_order = excluded.sort_order,
  active = excluded.active;

alter table public.customers enable row level security;
alter table public.plans enable row level security;
alter table public.orders enable row level security;
alter table public.payment_events enable row level security;
alter table public.memberships enable row level security;
alter table public.content_items enable row level security;
alter table public.access_logs enable row level security;

drop policy if exists "customers can read own profile" on public.customers;
create policy "customers can read own profile"
on public.customers for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "members can read own memberships" on public.memberships;
create policy "members can read own memberships"
on public.memberships for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "members can read active content metadata" on public.content_items;
create policy "members can read active content metadata"
on public.content_items for select
to authenticated
using (
  active
  and exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.expires_at > now()
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-content',
  'member-content',
  false,
  104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf', 'text/plain']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members cannot list private storage directly" on storage.objects;
create policy "members cannot list private storage directly"
on storage.objects for select
to authenticated
using (false);

commit;
