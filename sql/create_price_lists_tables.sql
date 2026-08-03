-- Tabla de Listas de Precios
create table if not exists public.price_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  customer_id uuid references public.customers(id) on delete set null,
  description text,
  status text not null default 'activa',
  valid_until timestamptz,
  discount_margin_percent numeric(5,2) default 0,
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla de Ítems de Lista de Precios (Precios personalizados por producto)
create table if not exists public.price_list_items (
  id bigserial primary key,
  price_list_id uuid not null references public.price_lists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  custom_price_minorista numeric(12,2) not null default 0,
  custom_price_mayorista numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Habilitar RLS
alter table public.price_lists enable row level security;
alter table public.price_list_items enable row level security;

-- Políticas para price_lists
create policy "Enable read access for authenticated users on price_lists"
  on public.price_lists for select
  to authenticated
  using (true);

create policy "Enable insert for authenticated users on price_lists"
  on public.price_lists for insert
  to authenticated
  with check (true);

create policy "Enable update for authenticated users on price_lists"
  on public.price_lists for update
  to authenticated
  using (true);

create policy "Enable delete for authenticated users on price_lists"
  on public.price_lists for delete
  to authenticated
  using (true);

-- Políticas para price_list_items
create policy "Enable read access for authenticated users on price_list_items"
  on public.price_list_items for select
  to authenticated
  using (true);

create policy "Enable insert for authenticated users on price_list_items"
  on public.price_list_items for insert
  to authenticated
  with check (true);

create policy "Enable update for authenticated users on price_list_items"
  on public.price_list_items for update
  to authenticated
  using (true);

create policy "Enable delete for authenticated users on price_list_items"
  on public.price_list_items for delete
  to authenticated
  using (true);

-- Índices
create index if not exists idx_price_lists_customer_id on public.price_lists(customer_id);
create index if not exists idx_price_lists_created_at on public.price_lists(created_at desc);
create index if not exists idx_price_list_items_price_list_id on public.price_list_items(price_list_id);
create index if not exists idx_price_list_items_product_id on public.price_list_items(product_id);
