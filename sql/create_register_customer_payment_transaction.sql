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
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

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
        select id, customer_id, amount_pending, status
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
        select id, customer_id, amount_pending, payment_method, is_cancelled
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
      type,
      amount,
      payment_method,
      comment,
      created_at
    )
    values (
      p_customer_id,
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
