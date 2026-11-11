-- Separa movimientos y cobros de clientes por sucursal.
-- Pagos históricos sin documento asociado quedan con branch_id NULL (Sin asignar).

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS branch_id BIGINT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS branch_id BIGINT;

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_branch_id_fkey') THEN
  ALTER TABLE public.payments ADD CONSTRAINT payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_payments_branch_id_fkey') THEN
  ALTER TABLE public.supplier_payments ADD CONSTRAINT supplier_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
 END IF;
END $$;

UPDATE public.payments p SET branch_id = s.branch_id FROM public.sales s WHERE p.branch_id IS NULL AND p.sale_id = s.id AND s.branch_id IS NOT NULL;
UPDATE public.payments p SET branch_id = o.branch_id FROM public.orders o WHERE p.branch_id IS NULL AND p.order_id = o.id AND o.branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_branch_created_at ON public.payments(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_branch_created_at ON public.supplier_payments(branch_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.stamp_customer_payment_branch() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_profile_branch BIGINT;
BEGIN
 IF NEW.branch_id IS NULL AND NEW.sale_id IS NOT NULL THEN SELECT branch_id INTO NEW.branch_id FROM public.sales WHERE id = NEW.sale_id; END IF;
 IF NEW.branch_id IS NULL AND NEW.order_id IS NOT NULL THEN SELECT branch_id INTO NEW.branch_id FROM public.orders WHERE id = NEW.order_id; END IF;
 IF NEW.branch_id IS NULL AND auth.uid() IS NOT NULL THEN SELECT branch_id INTO v_profile_branch FROM public.profiles WHERE id = auth.uid(); NEW.branch_id := v_profile_branch; END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_stamp_customer_payment_branch ON public.payments;
CREATE TRIGGER trg_stamp_customer_payment_branch BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.stamp_customer_payment_branch();

CREATE OR REPLACE FUNCTION public.stamp_supplier_payment_branch() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
 IF NEW.branch_id IS NULL AND auth.uid() IS NOT NULL THEN SELECT branch_id INTO NEW.branch_id FROM public.profiles WHERE id = auth.uid(); END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_stamp_supplier_payment_branch ON public.supplier_payments;
CREATE TRIGGER trg_stamp_supplier_payment_branch BEFORE INSERT ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION public.stamp_supplier_payment_branch();

-- Atomic customer payment registration: debt distribution + payment records + customer debt sync
create or replace function public.register_customer_payment_transaction(
  p_customer_id uuid,
  p_total_amount numeric,
  p_created_at timestamptz,
  p_comment text default null,
  p_methods jsonb default '[]'::jsonb,
  p_mode text default 'automatic',
  p_allocations jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_method record;
  v_allocation record;
  v_order record;
  v_sale record;
  v_methods_sum numeric := 0;
  v_allocations_sum numeric := 0;
  v_remaining numeric := coalesce(p_total_amount, 0);
  v_unapplied_amount numeric := 0;
  v_new_customer_debt numeric := 0;
  v_tolerance constant numeric := 0.01;
  v_branch_id BIGINT;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  SELECT branch_id INTO v_branch_id FROM public.profiles WHERE id = auth.uid();
  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene una sucursal activa asignada';
  END IF;

  if p_customer_id is null then
    raise exception 'Cliente requerido';
  end if;

  if coalesce(p_total_amount, 0) <= 0 then
    raise exception 'El monto total debe ser mayor a 0';
  end if;

  if p_methods is null or jsonb_typeof(p_methods) <> 'array' or jsonb_array_length(p_methods) = 0 then
    raise exception 'Debe especificar al menos un metodo de pago';
  end if;

  for v_method in
    select *
    from jsonb_to_recordset(p_methods) as t(
      method text,
      amount numeric
    )
  loop
    if coalesce(v_method.amount, 0) <= 0 then
      continue;
    end if;

    v_methods_sum := v_methods_sum + v_method.amount;
  end loop;

  if abs(v_methods_sum - p_total_amount) > v_tolerance then
    raise exception 'La suma de metodos (%) no coincide con el total (%)', v_methods_sum, p_total_amount;
  end if;

  if coalesce(p_mode, 'automatic') = 'specific' then
    if p_allocations is null
      or jsonb_typeof(p_allocations) <> 'array'
      or jsonb_array_length(p_allocations) = 0 then
      raise exception 'En modo especifico debe enviar asignaciones';
    end if;

    for v_allocation in
      select *
      from jsonb_to_recordset(p_allocations) as t(
        item_id uuid,
        item_type text,
        amount numeric
      )
    loop
      if v_allocation.item_id is null or coalesce(v_allocation.amount, 0) <= 0 then
        continue;
      end if;

      if v_allocation.item_type = 'order' then
        select id, customer_id, amount_pending, status, branch_id
          into v_order
        from public.orders
        where id = v_allocation.item_id
        for update;

        if not found then
          raise exception 'Pedido no encontrado: %', v_allocation.item_id;
        end if;

        if v_order.customer_id <> p_customer_id then
          raise exception 'Pedido % no pertenece al cliente', v_allocation.item_id;
        end if;

        IF v_order.branch_id IS DISTINCT FROM v_branch_id THEN
          RAISE EXCEPTION 'El pedido pertenece a otra sucursal';
        END IF;

        if coalesce(v_order.status, '') = 'cancelado' then
          raise exception 'No se puede aplicar pago a un pedido cancelado (%).', v_allocation.item_id;
        end if;

        if coalesce(v_allocation.amount, 0) - coalesce(v_order.amount_pending, 0) > v_tolerance then
          raise exception 'Monto excede saldo pendiente del pedido %', v_allocation.item_id;
        end if;

        update public.orders
        set amount_pending = greatest(0, coalesce(amount_pending, 0) - v_allocation.amount)
        where id = v_allocation.item_id;

        v_allocations_sum := v_allocations_sum + v_allocation.amount;
      elsif v_allocation.item_type = 'sale' then
        select id, customer_id, amount_pending, payment_method, is_cancelled, branch_id
          into v_sale
        from public.sales
        where id = v_allocation.item_id
        for update;

        if not found then
          raise exception 'Venta no encontrada: %', v_allocation.item_id;
        end if;

        if v_sale.customer_id <> p_customer_id then
          raise exception 'Venta % no pertenece al cliente', v_allocation.item_id;
        end if;

        IF v_sale.branch_id IS DISTINCT FROM v_branch_id THEN
          RAISE EXCEPTION 'La venta pertenece a otra sucursal';
        END IF;

        if coalesce(v_sale.is_cancelled, false) then
          raise exception 'No se puede aplicar pago a una venta cancelada (%).', v_allocation.item_id;
        end if;

        if coalesce(v_allocation.amount, 0) - coalesce(v_sale.amount_pending, 0) > v_tolerance then
          raise exception 'Monto excede saldo pendiente de la venta %', v_allocation.item_id;
        end if;

        update public.sales
        set amount_pending = greatest(0, coalesce(amount_pending, 0) - v_allocation.amount)
        where id = v_allocation.item_id;

        v_allocations_sum := v_allocations_sum + v_allocation.amount;
      else
        raise exception 'Tipo de asignacion invalido: %', coalesce(v_allocation.item_type, 'null');
      end if;
    end loop;

    if abs(v_allocations_sum - p_total_amount) > v_tolerance then
      raise exception 'La suma de asignaciones (%) no coincide con el total (%)', v_allocations_sum, p_total_amount;
    end if;
  else
    -- Automatic distribution: oldest debt first, matching existing behavior.
    for v_order in
      select id, amount_pending
      from public.orders
      where customer_id = p_customer_id
        and branch_id = v_branch_id
        and coalesce(status, '') <> 'cancelado'
        and coalesce(amount_pending, 0) > 0
      order by created_at asc
      for update
    loop
      exit when v_remaining <= v_tolerance;

      if v_order.amount_pending <= 0 then
        continue;
      end if;

      update public.orders
      set amount_pending = greatest(0, amount_pending - least(v_remaining, v_order.amount_pending))
      where id = v_order.id;

      v_remaining := v_remaining - least(v_remaining, v_order.amount_pending);
    end loop;

    for v_sale in
      select id, amount_pending
      from public.sales
      where customer_id = p_customer_id
        and branch_id = v_branch_id
        and coalesce(is_cancelled, false) = false
        and coalesce(amount_pending, 0) > 0
      order by created_at asc
      for update
    loop
      exit when v_remaining <= v_tolerance;

      if v_sale.amount_pending <= 0 then
        continue;
      end if;

      update public.sales
      set amount_pending = greatest(0, amount_pending - least(v_remaining, v_sale.amount_pending))
      where id = v_sale.id;

      v_remaining := v_remaining - least(v_remaining, v_sale.amount_pending);
    end loop;

    v_unapplied_amount := greatest(0, v_remaining);
  end if;

  -- Register one movement per payment method for traceability.
  for v_method in
    select *
    from jsonb_to_recordset(p_methods) as t(
      method text,
      amount numeric
    )
  loop
    if coalesce(v_method.amount, 0) <= 0 then
      continue;
    end if;

    insert into public.payments (
      customer_id,
      branch_id,
      type,
      amount,
      payment_method,
      comment,
      created_at
    )
    values (
      p_customer_id,
      v_branch_id,
      'pago',
      v_method.amount,
      v_method.method,
      coalesce(
        nullif(p_comment, ''),
        case
          when coalesce(p_mode, 'automatic') = 'specific' then 'Pago Especifico'
          else 'Pago a cuenta'
        end
      ),
      coalesce(p_created_at, now())
    );
  end loop;

  -- Keep denormalized customer debt in sync with pending balances.
  select
    coalesce((
      select sum(coalesce(o.amount_pending, 0))
      from public.orders o
      where o.customer_id = p_customer_id
        and coalesce(o.status, '') <> 'cancelado'
        and coalesce(o.amount_pending, 0) > 0
    ), 0)
    +
    coalesce((
      select sum(coalesce(s.amount_pending, 0))
      from public.sales s
      where s.customer_id = p_customer_id
        and coalesce(s.is_cancelled, false) = false
        and coalesce(s.amount_pending, 0) > 0
    ), 0)
  into v_new_customer_debt;

  update public.customers
  set debt = v_new_customer_debt
  where id = p_customer_id;

  return jsonb_build_object(
    'applied_amount', p_total_amount - v_unapplied_amount,
    'unapplied_amount', v_unapplied_amount,
    'new_customer_debt', v_new_customer_debt
  );
end;
$$;

grant execute on function public.register_customer_payment_transaction(
  uuid,
  numeric,
  timestamptz,
  text,
  jsonb,
  text,
  jsonb
) to authenticated;



-- Atomic payment cancelation: mark payment annulled + restore pending balances + sync customer debt
create or replace function public.cancel_customer_payment_transaction(
  p_payment_id bigint
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment record;
  v_item record;
  v_order record;
  v_sale record;
  v_remaining_restoration numeric := 0;
  v_restored_amount numeric := 0;
  v_new_customer_debt numeric := 0;
  v_tolerance constant numeric := 0.01;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  if p_payment_id is null then
    raise exception 'Pago requerido';
  end if;

  select id, customer_id, amount, type, payment_method, branch_id
    into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Pago no encontrado: %', p_payment_id;
  end if;

  IF v_payment.branch_id IS NULL THEN
    RAISE EXCEPTION 'El pago histórico está sin asignar a una sucursal y no puede anularse automáticamente';
  END IF;

  if v_payment.type <> 'pago' then
    raise exception 'Solo se pueden anular movimientos de tipo pago';
  end if;

  if coalesce(v_payment.payment_method, '') = 'anulado' then
    return jsonb_build_object(
      'payment_id', p_payment_id,
      'already_annulled', true,
      'restored_amount', 0,
      'remaining_unrestored', 0
    );
  end if;

  update public.payments
  set payment_method = 'anulado'
  where id = p_payment_id;

  v_remaining_restoration := coalesce(v_payment.amount, 0);

  -- Restore debt in LIFO order (newest debts first), matching current UI behavior.
  for v_item in
    select item_type, item_id, created_at
    from (
      select 'order'::text as item_type, o.id as item_id, o.created_at
      from public.orders o
      where o.customer_id = v_payment.customer_id
        and o.branch_id = v_payment.branch_id
        and coalesce(o.status, '') <> 'cancelado'

      union all

      select 'sale'::text as item_type, s.id as item_id, s.created_at
      from public.sales s
      where s.customer_id = v_payment.customer_id
        and s.branch_id = v_payment.branch_id
        and coalesce(s.is_cancelled, false) = false
    ) x
    order by created_at desc
  loop
    exit when v_remaining_restoration <= v_tolerance;

    if v_item.item_type = 'order' then
      select id, total_amount, amount_pending
        into v_order
      from public.orders
      where id = v_item.item_id
      for update;

      if not found then
        continue;
      end if;

      if coalesce(v_order.total_amount, 0) - coalesce(v_order.amount_pending, 0) > v_tolerance then
        -- paid amount available to restore
        declare
          v_paid_amount numeric;
          v_restore_amount numeric;
        begin
          v_paid_amount := coalesce(v_order.total_amount, 0) - coalesce(v_order.amount_pending, 0);
          v_restore_amount := least(v_remaining_restoration, v_paid_amount);

          update public.orders
          set amount_pending = least(
            coalesce(total_amount, 0),
            coalesce(amount_pending, 0) + v_restore_amount
          )
          where id = v_order.id;

          v_remaining_restoration := v_remaining_restoration - v_restore_amount;
          v_restored_amount := v_restored_amount + v_restore_amount;
        end;
      end if;
    else
      select id, total_amount, amount_pending
        into v_sale
      from public.sales
      where id = v_item.item_id
      for update;

      if not found then
        continue;
      end if;

      if coalesce(v_sale.total_amount, 0) - coalesce(v_sale.amount_pending, 0) > v_tolerance then
        declare
          v_paid_amount numeric;
          v_restore_amount numeric;
        begin
          v_paid_amount := coalesce(v_sale.total_amount, 0) - coalesce(v_sale.amount_pending, 0);
          v_restore_amount := least(v_remaining_restoration, v_paid_amount);

          update public.sales
          set amount_pending = least(
            coalesce(total_amount, 0),
            coalesce(amount_pending, 0) + v_restore_amount
          )
          where id = v_sale.id;

          v_remaining_restoration := v_remaining_restoration - v_restore_amount;
          v_restored_amount := v_restored_amount + v_restore_amount;
        end;
      end if;
    end if;
  end loop;

  select
    coalesce((
      select sum(coalesce(o.amount_pending, 0))
      from public.orders o
      where o.customer_id = v_payment.customer_id
        and coalesce(o.status, '') <> 'cancelado'
        and coalesce(o.amount_pending, 0) > 0
    ), 0)
    +
    coalesce((
      select sum(coalesce(s.amount_pending, 0))
      from public.sales s
      where s.customer_id = v_payment.customer_id
        and coalesce(s.is_cancelled, false) = false
        and coalesce(s.amount_pending, 0) > 0
    ), 0)
  into v_new_customer_debt;

  update public.customers
  set debt = v_new_customer_debt
  where id = v_payment.customer_id;

  return jsonb_build_object(
    'payment_id', p_payment_id,
    'customer_id', v_payment.customer_id,
    'restored_amount', v_restored_amount,
    'remaining_unrestored', greatest(0, v_remaining_restoration),
    'new_customer_debt', v_new_customer_debt
  );
end;
$$;

grant execute on function public.cancel_customer_payment_transaction(bigint) to authenticated;



-- Atomic payment edit: revert old payment amount + update payment details + re-apply new payment amount + sync customer debt
create or replace function public.edit_customer_payment_transaction(
  p_payment_id bigint,
  p_new_amount numeric,
  p_new_payment_method text,
  p_new_comment text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment record;
  v_item record;
  v_order record;
  v_sale record;
  v_remaining_restoration numeric := 0;
  v_restored_amount numeric := 0;
  v_remaining_allocation numeric := 0;
  v_unapplied_amount numeric := 0;
  v_new_customer_debt numeric := 0;
  v_tolerance constant numeric := 0.01;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  if p_payment_id is null then
    raise exception 'Pago requerido';
  end if;

  if p_new_amount is null or p_new_amount <= 0 then
    raise exception 'El monto debe ser mayor a 0';
  end if;

  -- 1. Fetch and lock payment row
  select id, customer_id, amount, type, payment_method, branch_id
    into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Pago no encontrado: %', p_payment_id;
  end if;

  IF v_payment.branch_id IS NULL THEN
    RAISE EXCEPTION 'El pago histórico está sin asignar a una sucursal y no puede editarse automáticamente';
  END IF;

  if v_payment.type <> 'pago' then
    raise exception 'Solo se pueden editar movimientos de tipo pago';
  end if;

  -- 2. First, REVERT the old payment amount (same as cancellation logic)
  v_remaining_restoration := coalesce(v_payment.amount, 0);

  for v_item in
    select item_type, item_id, created_at
    from (
      select 'order'::text as item_type, o.id as item_id, o.created_at
      from public.orders o
      where o.customer_id = v_payment.customer_id
        and o.branch_id = v_payment.branch_id
        and coalesce(o.status, '') <> 'cancelado'

      union all

      select 'sale'::text as item_type, s.id as item_id, s.created_at
      from public.sales s
      where s.customer_id = v_payment.customer_id
        and s.branch_id = v_payment.branch_id
        and coalesce(s.is_cancelled, false) = false
    ) x
    order by created_at desc
  loop
    exit when v_remaining_restoration <= v_tolerance;

    if v_item.item_type = 'order' then
      select id, total_amount, amount_pending
        into v_order
      from public.orders
      where id = v_item.item_id
      for update;

      if not found then
        continue;
      end if;

      if coalesce(v_order.total_amount, 0) - coalesce(v_order.amount_pending, 0) > v_tolerance then
        declare
          v_paid_amount numeric;
          v_restore_amount numeric;
        begin
          v_paid_amount := coalesce(v_order.total_amount, 0) - coalesce(v_order.amount_pending, 0);
          v_restore_amount := least(v_remaining_restoration, v_paid_amount);

          update public.orders
          set amount_pending = least(
            coalesce(total_amount, 0),
            coalesce(amount_pending, 0) + v_restore_amount
          )
          where id = v_order.id;

          v_remaining_restoration := v_remaining_restoration - v_restore_amount;
          v_restored_amount := v_restored_amount + v_restore_amount;
        end;
      end if;
    else
      select id, total_amount, amount_pending
        into v_sale
      from public.sales
      where id = v_item.item_id
      for update;

      if not found then
        continue;
      end if;

      if coalesce(v_sale.total_amount, 0) - coalesce(v_sale.amount_pending, 0) > v_tolerance then
        declare
          v_paid_amount numeric;
          v_restore_amount numeric;
        begin
          v_paid_amount := coalesce(v_sale.total_amount, 0) - coalesce(v_sale.amount_pending, 0);
          v_restore_amount := least(v_remaining_restoration, v_paid_amount);

          update public.sales
          set amount_pending = least(
            coalesce(total_amount, 0),
            coalesce(amount_pending, 0) + v_restore_amount
          )
          where id = v_sale.id;

          v_remaining_restoration := v_remaining_restoration - v_restore_amount;
          v_restored_amount := v_restored_amount + v_restore_amount;
        end;
      end if;
    end if;
  end loop;

  -- 3. Update the payment details in the database
  update public.payments
  set amount = p_new_amount,
      payment_method = p_new_payment_method,
      comment = p_new_comment
  where id = p_payment_id;

  -- 4. Apply the NEW payment amount (automatic FIFO distribution)
  v_remaining_allocation := p_new_amount;

  for v_order in
    select id, amount_pending
    from public.orders
    where customer_id = v_payment.customer_id
      and branch_id = v_payment.branch_id
      and coalesce(status, '') <> 'cancelado'
      and coalesce(amount_pending, 0) > 0
    order by created_at asc
    for update
  loop
    exit when v_remaining_allocation <= v_tolerance;

    if v_order.amount_pending <= 0 then
      continue;
    end if;

    declare
      v_apply_amount numeric;
    begin
      v_apply_amount := least(v_remaining_allocation, v_order.amount_pending);
      update public.orders
      set amount_pending = greatest(0, amount_pending - v_apply_amount)
      where id = v_order.id;

      v_remaining_allocation := v_remaining_allocation - v_apply_amount;
    end;
  end loop;

  for v_sale in
    select id, amount_pending
    from public.sales
    where customer_id = v_payment.customer_id
      and branch_id = v_payment.branch_id
      and coalesce(is_cancelled, false) = false
      and coalesce(amount_pending, 0) > 0
    order by created_at asc
    for update
  loop
    exit when v_remaining_allocation <= v_tolerance;

    if v_sale.amount_pending <= 0 then
      continue;
    end if;

    declare
      v_apply_amount numeric;
    begin
      v_apply_amount := least(v_remaining_allocation, v_sale.amount_pending);
      update public.sales
      set amount_pending = greatest(0, amount_pending - v_apply_amount)
      where id = v_sale.id;

      v_remaining_allocation := v_remaining_allocation - v_apply_amount;
    end;
  end loop;

  v_unapplied_amount := greatest(0, v_remaining_allocation);

  -- 5. Sync the customer's total debt
  select
    coalesce((
      select sum(coalesce(o.amount_pending, 0))
      from public.orders o
      where o.customer_id = v_payment.customer_id
        and coalesce(o.status, '') <> 'cancelado'
        and coalesce(o.amount_pending, 0) > 0
    ), 0)
    +
    coalesce((
      select sum(coalesce(s.amount_pending, 0))
      from public.sales s
      where s.customer_id = v_payment.customer_id
        and coalesce(s.is_cancelled, false) = false
        and coalesce(s.amount_pending, 0) > 0
    ), 0)
  into v_new_customer_debt;

  update public.customers
  set debt = v_new_customer_debt
  where id = v_payment.customer_id;

  return jsonb_build_object(
    'payment_id', p_payment_id,
    'customer_id', v_payment.customer_id,
    'new_amount', p_new_amount,
    'unapplied_amount', v_unapplied_amount,
    'new_customer_debt', v_new_customer_debt
  );
end;
$$;

grant execute on function public.edit_customer_payment_transaction(bigint, numeric, text, text) to authenticated;


+
-- Reemplaza tambien la función de ajustes para limitarla a la sucursal activa.
-- Permite que un administrador cobre aumentos de precio en comprobantes con saldo.
-- Los precios originales de los renglones no se sobrescriben: cada aumento queda
-- como un débito separado en la cuenta corriente y en el historial de pagos.

CREATE TABLE IF NOT EXISTS public.price_adjustment_items (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  order_item_id BIGINT REFERENCES public.order_items(id) ON DELETE CASCADE,
  sale_item_id BIGINT REFERENCES public.sale_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  previous_unit_price NUMERIC(12,2) NOT NULL,
  applied_unit_price NUMERIC(12,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  adjustment_amount NUMERIC(12,2) NOT NULL CHECK (adjustment_amount > 0),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id BIGINT REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT price_adjustment_items_one_source CHECK (
    (order_item_id IS NOT NULL AND sale_item_id IS NULL AND order_id IS NOT NULL AND sale_id IS NULL)
    OR
    (sale_item_id IS NOT NULL AND order_item_id IS NULL AND sale_id IS NOT NULL AND order_id IS NULL)
  )
);

ALTER TABLE public.price_adjustment_items
  ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES public.branches(id) ON DELETE SET NULL;
UPDATE public.price_adjustment_items pai SET branch_id = o.branch_id
FROM public.orders o WHERE pai.branch_id IS NULL AND pai.order_id = o.id;
UPDATE public.price_adjustment_items pai SET branch_id = s.branch_id
FROM public.sales s WHERE pai.branch_id IS NULL AND pai.sale_id = s.id;

CREATE INDEX IF NOT EXISTS idx_price_adjustment_items_order_item
  ON public.price_adjustment_items(order_item_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_price_adjustment_items_sale_item
  ON public.price_adjustment_items(sale_item_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_price_adjustment_items_customer_history
  ON public.price_adjustment_items(created_at DESC);

ALTER TABLE public.price_adjustment_items ENABLE ROW LEVEL SECURITY;

-- Vincula el débito de ajuste al pedido, también en bases creadas desde el bootstrap.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.apply_current_price_adjustments(
  p_order_ids UUID[] DEFAULT '{}'::UUID[],
  p_sale_ids UUID[] DEFAULT '{}'::UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT;
  v_active_branch_id BIGINT;
  v_order_id UUID;
  v_sale_id UUID;
  v_order RECORD;
  v_sale RECORD;
  v_item RECORD;
  v_customer_type TEXT;
  v_previous_unit_price NUMERIC(12,2);
  v_current_unit_price NUMERIC(12,2);
  v_line_adjustment NUMERIC(12,2);
  v_record_adjustment NUMERIC(12,2);
  v_adjusted_orders INTEGER := 0;
  v_adjusted_sales INTEGER := 0;
  v_adjusted_records INTEGER := 0;
  v_total_adjustment NUMERIC(12,2) := 0;
  v_details JSONB := '[]'::JSONB;
  v_short_id TEXT;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT role, branch_id INTO v_actor_role, v_active_branch_id
  FROM public.profiles
  WHERE id = v_actor_id;

  IF v_actor_role IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'Solo un administrador puede aplicar ajustes de precio';
  END IF;
  IF v_active_branch_id IS NULL THEN
    RAISE EXCEPTION 'Selecciona una sucursal activa antes de aplicar ajustes';
  END IF;

  IF COALESCE(cardinality(p_order_ids), 0) + COALESCE(cardinality(p_sale_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Selecciona al menos un pedido o una venta';
  END IF;

  IF COALESCE(cardinality(p_order_ids), 0) + COALESCE(cardinality(p_sale_ids), 0) > 200 THEN
    RAISE EXCEPTION 'Puedes actualizar hasta 200 comprobantes por operación';
  END IF;

  -- Los pedidos cancelados o sin saldo no se modifican. El precio original de
  -- cada renglón queda intacto; solo se agrega el aumento al total y al saldo.
  FOR v_order_id IN
    SELECT DISTINCT x
    FROM unnest(COALESCE(p_order_ids, '{}'::UUID[])) AS x
    ORDER BY x
  LOOP
    SELECT id, customer_id, total_amount, amount_pending, status, branch_id
      INTO v_order
    FROM public.orders
    WHERE id = v_order_id
    FOR UPDATE;

    IF NOT FOUND OR v_order.customer_id IS NULL
       OR v_order.branch_id IS DISTINCT FROM v_active_branch_id
       OR COALESCE(v_order.amount_pending, 0) <= 0
       OR v_order.status = 'cancelado' THEN
      CONTINUE;
    END IF;

    SELECT customer_type INTO v_customer_type
    FROM public.customers
    WHERE id = v_order.customer_id;

    v_record_adjustment := 0;

    FOR v_item IN
      SELECT oi.id, oi.product_id, oi.quantity, COALESCE(oi.price, 0) AS original_price,
             p.price_minorista, p.price_mayorista
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = v_order_id
      ORDER BY oi.id
      FOR UPDATE OF oi
    LOOP
      SELECT applied_unit_price INTO v_previous_unit_price
      FROM public.price_adjustment_items
      WHERE order_item_id = v_item.id
      ORDER BY id DESC
      LIMIT 1;

      v_previous_unit_price := COALESCE(v_previous_unit_price, v_item.original_price);
      v_current_unit_price := CASE
        WHEN v_customer_type = 'mayorista'
          THEN COALESCE(v_item.price_mayorista, v_previous_unit_price)
        ELSE COALESCE(v_item.price_minorista, v_previous_unit_price)
      END;
      v_line_adjustment := ROUND(
        GREATEST(v_current_unit_price - v_previous_unit_price, 0) * v_item.quantity,
        2
      );

      IF v_line_adjustment > 0 THEN
        INSERT INTO public.price_adjustment_items (
          order_id, order_item_id, product_id, branch_id, previous_unit_price,
          applied_unit_price, quantity, adjustment_amount, created_by
        ) VALUES (
          v_order_id, v_item.id, v_item.product_id, v_order.branch_id, v_previous_unit_price,
          v_current_unit_price, v_item.quantity, v_line_adjustment, v_actor_id
        );
        v_record_adjustment := v_record_adjustment + v_line_adjustment;
      END IF;
    END LOOP;

    IF v_record_adjustment > 0 THEN
      UPDATE public.orders
      SET total_amount = COALESCE(total_amount, 0) + v_record_adjustment,
          amount_pending = COALESCE(amount_pending, 0) + v_record_adjustment,
          updated_at = now()
      WHERE id = v_order_id;

      v_short_id := LEFT(v_order_id::TEXT, 8);
      INSERT INTO public.payments (
        customer_id, branch_id, order_id, type, amount, payment_method, comment, created_at
      ) VALUES (
        v_order.customer_id, v_order.branch_id, v_order_id, 'compra', v_record_adjustment,
        'ajuste_precio',
        'Ajuste de precio a valores actuales - Pedido #' || v_short_id,
        now()
      );

      UPDATE public.customers
      SET debt = COALESCE(debt, 0) + v_record_adjustment
      WHERE id = v_order.customer_id;

      v_adjusted_orders := v_adjusted_orders + 1;
      v_adjusted_records := v_adjusted_records + 1;
      v_total_adjustment := v_total_adjustment + v_record_adjustment;
      v_details := v_details || jsonb_build_array(jsonb_build_object(
        'type', 'order', 'id', v_order_id, 'adjustment', v_record_adjustment
      ));
    END IF;
  END LOOP;

  -- Ventas de mostrador anuladas o saldadas quedan excluidas.
  FOR v_sale_id IN
    SELECT DISTINCT x
    FROM unnest(COALESCE(p_sale_ids, '{}'::UUID[])) AS x
    ORDER BY x
  LOOP
    SELECT id, customer_id, total_amount, amount_pending, is_cancelled, branch_id
      INTO v_sale
    FROM public.sales
    WHERE id = v_sale_id
    FOR UPDATE;

    IF NOT FOUND OR v_sale.customer_id IS NULL
       OR v_sale.branch_id IS DISTINCT FROM v_active_branch_id
       OR COALESCE(v_sale.amount_pending, 0) <= 0
       OR COALESCE(v_sale.is_cancelled, false) THEN
      CONTINUE;
    END IF;

    SELECT customer_type INTO v_customer_type
    FROM public.customers
    WHERE id = v_sale.customer_id;

    v_record_adjustment := 0;

    FOR v_item IN
      SELECT si.id, si.product_id, si.quantity, si.price AS original_price,
             p.price_minorista, p.price_mayorista
      FROM public.sale_items si
      JOIN public.products p ON p.id = si.product_id
      WHERE si.sale_id = v_sale_id
      ORDER BY si.id
      FOR UPDATE OF si
    LOOP
      SELECT applied_unit_price INTO v_previous_unit_price
      FROM public.price_adjustment_items
      WHERE sale_item_id = v_item.id
      ORDER BY id DESC
      LIMIT 1;

      v_previous_unit_price := COALESCE(v_previous_unit_price, v_item.original_price);
      v_current_unit_price := CASE
        WHEN v_customer_type = 'mayorista'
          THEN COALESCE(v_item.price_mayorista, v_previous_unit_price)
        ELSE COALESCE(v_item.price_minorista, v_previous_unit_price)
      END;
      v_line_adjustment := ROUND(
        GREATEST(v_current_unit_price - v_previous_unit_price, 0) * v_item.quantity,
        2
      );

      IF v_line_adjustment > 0 THEN
        INSERT INTO public.price_adjustment_items (
          sale_id, sale_item_id, product_id, branch_id, previous_unit_price,
          applied_unit_price, quantity, adjustment_amount, created_by
        ) VALUES (
          v_sale_id, v_item.id, v_item.product_id, v_sale.branch_id, v_previous_unit_price,
          v_current_unit_price, v_item.quantity, v_line_adjustment, v_actor_id
        );
        v_record_adjustment := v_record_adjustment + v_line_adjustment;
      END IF;
    END LOOP;

    IF v_record_adjustment > 0 THEN
      UPDATE public.sales
      SET total_amount = COALESCE(total_amount, 0) + v_record_adjustment,
          amount_pending = COALESCE(amount_pending, 0) + v_record_adjustment
      WHERE id = v_sale_id;

      v_short_id := LEFT(v_sale_id::TEXT, 8);
      INSERT INTO public.payments (
        customer_id, branch_id, sale_id, type, amount, payment_method, comment, created_at
      ) VALUES (
        v_sale.customer_id, v_sale.branch_id, v_sale_id, 'compra', v_record_adjustment,
        'ajuste_precio',
        'Ajuste de precio a valores actuales - Venta #' || v_short_id,
        now()
      );

      UPDATE public.customers
      SET debt = COALESCE(debt, 0) + v_record_adjustment
      WHERE id = v_sale.customer_id;

      v_adjusted_sales := v_adjusted_sales + 1;
      v_adjusted_records := v_adjusted_records + 1;
      v_total_adjustment := v_total_adjustment + v_record_adjustment;
      v_details := v_details || jsonb_build_array(jsonb_build_object(
        'type', 'sale', 'id', v_sale_id, 'adjustment', v_record_adjustment
      ));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'adjusted_orders', v_adjusted_orders,
    'adjusted_sales', v_adjusted_sales,
    'adjusted_records', v_adjusted_records,
    'total_adjustment', v_total_adjustment,
    'details', v_details
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_current_price_adjustments(UUID[], UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_current_price_adjustments(UUID[], UUID[]) TO authenticated;



