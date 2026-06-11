-- Atomic payment edit: revert old payment amount + update payment details + re-apply new payment amount + sync customer debt
create or replace function public.edit_customer_payment_transaction(
  p_payment_id uuid,
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
  select id, customer_id, amount, type, payment_method
    into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Pago no encontrado: %', p_payment_id;
  end if;

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
        and coalesce(o.status, '') <> 'cancelado'

      union all

      select 'sale'::text as item_type, s.id as item_id, s.created_at
      from public.sales s
      where s.customer_id = v_payment.customer_id
        and coalesce(s.payment_method, '') = 'cuenta_corriente'
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
      and coalesce(payment_method, '') = 'cuenta_corriente'
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
        and coalesce(s.payment_method, '') = 'cuenta_corriente'
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

grant execute on function public.edit_customer_payment_transaction(uuid, numeric, text, text) to authenticated;
