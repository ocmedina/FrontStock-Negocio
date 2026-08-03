-- Frontstock/My-App full bootstrap schema
-- Generated from repository usage + existing migrations
-- Date: 2026-03-21

begin;

create extension if not exists pgcrypto;

-- =====================================================
-- Core catalog tables
-- =====================================================
create table if not exists public.brands (
  id bigserial primary key,
  name text not null unique
);

create table if not exists public.categories (
  id bigserial primary key,
  name text not null unique
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  email text,
  role text not null default 'empleado',
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  address text,
  reference text,
  delivery_day text,
  customer_type text not null default 'minorista',
  debt numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_full_name on public.customers(full_name);
create index if not exists idx_customers_is_active on public.customers(is_active);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  cuit text,
  phone text,
  email text,
  address text,
  debt numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_suppliers_name on public.suppliers(name);
create index if not exists idx_suppliers_is_active on public.suppliers(is_active);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  barcode text,
  name text not null,
  description text,
  brand_id bigint references public.brands(id) on delete set null,
  category_id bigint references public.categories(id) on delete set null,
  cost_price numeric(12,2) default 0,
  price_minorista numeric(12,2) not null,
  price_mayorista numeric(12,2) not null,
  stock integer not null default 0,
  stock_minimo integer default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_name on public.products(name);
create index if not exists idx_products_sku on public.products(sku);
create index if not exists idx_products_barcode on public.products(barcode);
create index if not exists idx_products_is_active on public.products(is_active);

-- =====================================================
-- Sales and customer account
-- =====================================================
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  total_amount numeric(12,2) not null default 0,
  payment_method text default 'efectivo',
  amount_paid numeric(12,2) not null default 0,
  amount_pending numeric(12,2) not null default 0,
  description text,
  is_cancelled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_customer_id on public.sales(customer_id);
create index if not exists idx_sales_created_at on public.sales(created_at);
create index if not exists idx_sales_is_cancelled on public.sales(is_cancelled);

create table if not exists public.sale_items (
  id bigserial primary key,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  price numeric(12,2) not null check (price >= 0)
);

create index if not exists idx_sale_items_sale_id on public.sale_items(sale_id);
create index if not exists idx_sale_items_product_id on public.sale_items(product_id);

create table if not exists public.payments (
  id bigserial primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete set null,
  type text not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_customer_id on public.payments(customer_id);
create index if not exists idx_payments_created_at on public.payments(created_at);
create index if not exists idx_payments_type on public.payments(type);

-- =====================================================
-- Orders (delivery)
-- =====================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  total_amount numeric(12,2) not null default 0,
  status text not null default 'pendiente',
  payment_method text default 'efectivo',
  amount_paid numeric(12,2) not null default 0,
  amount_pending numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at);

create table if not exists public.order_items (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  price numeric(12,2) not null default 0,
  unit_price numeric(12,2),
  subtotal numeric(12,2),
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);

-- =====================================================
-- Invoicing and settings
-- =====================================================
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  sale_id uuid not null unique references public.sales(id) on delete cascade,
  customer_data jsonb not null,
  items_data jsonb not null,
  total_amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoices_created_at on public.invoices(created_at);

create table if not exists public.settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- =====================================================
-- Purchases and supplier account
-- =====================================================
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  invoice_number text,
  total_amount numeric(12,2) not null,
  amount_paid numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_purchases_supplier_id on public.purchases(supplier_id);
create index if not exists idx_purchases_created_at on public.purchases(created_at);

create table if not exists public.purchase_items (
  id bigserial primary key,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  cost_price numeric(12,2) not null check (cost_price >= 0)
);

create index if not exists idx_purchase_items_purchase_id on public.purchase_items(purchase_id);
create index if not exists idx_purchase_items_product_id on public.purchase_items(product_id);

create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null default 'efectivo',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_supplier_payments_supplier_id on public.supplier_payments(supplier_id);
create index if not exists idx_supplier_payments_created_at on public.supplier_payments(created_at);

-- =====================================================
-- Supplier purchase order flow (used in /proveedores/ordenes)
-- Note: current app code uses brands as supplier source for this module
-- =====================================================
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  supplier_id bigint references public.brands(id) on delete set null,
  status text not null default 'draft',
  total_amount numeric(12,2) not null default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_purchase_orders_status on public.purchase_orders(status);
create index if not exists idx_purchase_orders_supplier_id on public.purchase_orders(supplier_id);

create table if not exists public.purchase_order_items (
  id bigserial primary key,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0)
);

create index if not exists idx_po_items_po_id on public.purchase_order_items(purchase_order_id);
create index if not exists idx_po_items_product_id on public.purchase_order_items(product_id);

-- =====================================================
-- Inventory movements and finance
-- =====================================================
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  movement_type text not null,
  quantity integer not null,
  previous_stock integer,
  new_stock integer,
  reference_id text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_product_id on public.stock_movements(product_id);
create index if not exists idx_stock_movements_created_at on public.stock_movements(created_at);
create index if not exists idx_stock_movements_type on public.stock_movements(movement_type);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  category text not null,
  date date not null default current_date,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_date on public.expenses(date);
create index if not exists idx_expenses_category on public.expenses(category);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  type text not null,
  amount numeric(12,2) not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_cash_movements_created_at on public.cash_movements(created_at);
create index if not exists idx_cash_movements_type on public.cash_movements(type);

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  report_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_daily_reports_report_date on public.daily_reports(report_date);

-- =====================================================
-- Budgets / quotations
-- =====================================================
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  status text not null default 'activo',
  created_at timestamptz not null default now()
);

create table if not exists public.budget_items (
  id bigserial primary key,
  budget_id uuid not null references public.budgets(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  price numeric(12,2) not null check (price >= 0)
);

create index if not exists idx_budgets_created_at on public.budgets(created_at);
create index if not exists idx_budgets_customer_id on public.budgets(customer_id);
create index if not exists idx_budget_items_budget_id on public.budget_items(budget_id);
create index if not exists idx_budget_items_product_id on public.budget_items(product_id);

-- =====================================================
-- Utility functions/triggers
-- =====================================================
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row
execute function public.update_updated_at_column();

create or replace function public.touch_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at
before update on public.settings
for each row
execute function public.touch_settings_updated_at();

create sequence if not exists public.invoice_number_seq;

create or replace function public.generate_invoice_number()
returns text
language plpgsql
as $$
declare
  n bigint;
begin
  n := nextval('public.invoice_number_seq');
  return 'FAC-' || lpad(n::text, 8, '0');
end;
$$;

create or replace function public.increment_supplier_debt(
  supplier_id_in uuid,
  amount_in numeric
)
returns void
language plpgsql
as $$
begin
  update public.suppliers
  set debt = coalesce(debt, 0) + coalesce(amount_in, 0)
  where id = supplier_id_in;
end;
$$;

create or replace function public.increment_stock(
  product_id_in uuid,
  quantity_in integer
)
returns void
language plpgsql
as $$
begin
  update public.products
  set stock = coalesce(stock, 0) + coalesce(quantity_in, 0)
  where id = product_id_in;
end;
$$;

create or replace function public.log_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_user_id uuid default null,
  p_reference_id text default null,
  p_notes text default null
)
returns void
language plpgsql
as $$
declare
  v_current_stock integer;
  v_new_stock integer;
begin
  select stock into v_current_stock
  from public.products
  where id = p_product_id
  for update;

  if v_current_stock is null then
    raise exception 'Product not found';
  end if;

  v_new_stock := v_current_stock + p_quantity;

  update public.products
  set stock = v_new_stock
  where id = p_product_id;

  insert into public.stock_movements (
    product_id,
    user_id,
    movement_type,
    quantity,
    previous_stock,
    new_stock,
    reference_id,
    notes
  )
  values (
    p_product_id,
    p_user_id,
    p_movement_type,
    p_quantity,
    v_current_stock,
    v_new_stock,
    p_reference_id,
    p_notes
  );
end;
$$;

create or replace function public.handle_order_status_change(
  order_id_param uuid,
  new_status_param text
)
returns void
language plpgsql
as $$
declare
  current_status text;
  item record;
  v_current_stock integer;
  v_user_id uuid;
begin
  select status into current_status from public.orders where id = order_id_param;

  v_user_id := auth.uid();

  if current_status = new_status_param then
    return;
  end if;

  if new_status_param = 'entregado' and current_status != 'entregado' then
    for item in
      select product_id, quantity
      from public.order_items
      where order_id = order_id_param
    loop
      select stock into v_current_stock from public.products where id = item.product_id for update;

      update public.products
      set stock = stock - item.quantity
      where id = item.product_id;

      insert into public.stock_movements (
        product_id,
        user_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        reference_id,
        notes
      )
      values (
        item.product_id,
        v_user_id,
        'venta',
        -item.quantity,
        v_current_stock,
        v_current_stock - item.quantity,
        order_id_param::text,
        'Entrega de pedido #' || order_id_param::text
      );
    end loop;
  end if;

  if current_status = 'entregado' and new_status_param != 'entregado' then
    for item in
      select product_id, quantity
      from public.order_items
      where order_id = order_id_param
    loop
      select stock into v_current_stock from public.products where id = item.product_id for update;

      update public.products
      set stock = stock + item.quantity
      where id = item.product_id;

      insert into public.stock_movements (
        product_id,
        user_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        reference_id,
        notes
      )
      values (
        item.product_id,
        v_user_id,
        'devolucion',
        item.quantity,
        v_current_stock,
        v_current_stock + item.quantity,
        order_id_param::text,
        'Cancelacion/Reversion de entrega de pedido #' || order_id_param::text
      );
    end loop;
  end if;

  update public.orders
  set status = new_status_param
  where id = order_id_param;
end;
$$;

-- Auto order number for purchase_orders
create sequence if not exists public.purchase_order_number_seq;

create or replace function public.set_purchase_order_number()
returns trigger
language plpgsql
as $$
declare
  n bigint;
begin
  if new.order_number is null or length(trim(new.order_number)) = 0 then
    n := nextval('public.purchase_order_number_seq');
    new.order_number := 'OC-' || lpad(n::text, 8, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_purchase_order_number on public.purchase_orders;
create trigger trg_purchase_order_number
before insert on public.purchase_orders
for each row
execute function public.set_purchase_order_number();

-- =====================================================
-- RLS policies (open to authenticated users, as in current app)
-- =====================================================

do $$
declare
  t text;
  tables text[] := array[
    'brands', 'categories', 'profiles', 'customers', 'suppliers', 'products',
    'sales', 'sale_items', 'payments', 'orders', 'order_items',
    'invoices', 'settings', 'purchases', 'purchase_items', 'supplier_payments',
    'purchase_orders', 'purchase_order_items', 'stock_movements', 'expenses',
    'cash_movements', 'daily_reports', 'budgets', 'budget_items', 'price_lists', 'price_list_items'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "auth_select_%I" on public.%I', t, t);
    execute format('drop policy if exists "auth_insert_%I" on public.%I', t, t);
    execute format('drop policy if exists "auth_update_%I" on public.%I', t, t);
    execute format('drop policy if exists "auth_delete_%I" on public.%I', t, t);

    execute format('create policy "auth_select_%I" on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy "auth_insert_%I" on public.%I for insert to authenticated with check (true)', t, t);
    execute format('create policy "auth_update_%I" on public.%I for update to authenticated using (true) with check (true)', t, t);
    execute format('create policy "auth_delete_%I" on public.%I for delete to authenticated using (true)', t, t);
  end loop;
end $$;

-- Useful grants
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

commit;
