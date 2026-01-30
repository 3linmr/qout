create extension if not exists "pgcrypto";

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists menu_items (
  id bigserial primary key,
  name text not null,
  description text not null,
  price numeric(10, 2) not null,
  category text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  phone text,
  pickup_type text,
  pickup_date date,
  pickup_time time,
  pickup_label text,
  subtotal numeric(10, 2) not null,
  tax numeric(10, 2) not null,
  total numeric(10, 2) not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  item_id bigint references menu_items(id),
  name text not null,
  price numeric(10, 2) not null,
  qty integer not null,
  created_at timestamptz not null default now()
);

