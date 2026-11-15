-- Atomic payment cancelation: mark payment annulled + restore pending balances + sync customer debt
alter table public.payments
  add column if not exists order_id uuid references public.orders(id) on delete set null;

alter table public.payments
  add column if not exists sale_id uuid references public.sales(id) on delete set null;

drop function if exists public.cancel_customer_payment_transaction(uuid);

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

  select id, customer_id, amount, type, payment_method, order_id, sale_id
    into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Pago no encontrado: %', p_payment_id;
  end if;

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

  -- Linked payments restore the exact invoice they affected.
  if v_payment.order_id is not null then
    select id, total_amount, amount_paid, amount_pending
      into v_order
    from public.orders
    where id = v_payment.order_id
      and coalesce(status, '') <> 'cancelado'
    for update;

    if found then
      v_restored_amount := least(
        v_remaining_restoration,
        greatest(0, coalesce(v_order.total_amount, 0) - coalesce(v_order.amount_pending, 0))
      );
      update public.orders
      set amount_pending = least(coalesce(total_amount, 0), coalesce(amount_pending, 0) + v_restored_amount),
          amount_paid = greatest(0, coalesce(amount_paid, 0) - v_restored_amount)
      where id = v_order.id;
      v_remaining_restoration := v_remaining_restoration - v_restored_amount;
    end if;
  elsif v_payment.sale_id is not null then
    select id, total_amount, amount_paid, amount_pending
      into v_sale
    from public.sales
    where id = v_payment.sale_id
      and coalesce(is_cancelled, false) = false
    for update;

    if found then
      v_restored_amount := least(
        v_remaining_restoration,
        greatest(0, coalesce(v_sale.total_amount, 0) - coalesce(v_sale.amount_pending, 0))
      );
      update public.sales
      set amount_pending = least(coalesce(total_amount, 0), coalesce(amount_pending, 0) + v_restored_amount),
          amount_paid = greatest(0, coalesce(amount_paid, 0) - v_restored_amount)
      where id = v_sale.id;
      v_remaining_restoration := v_remaining_restoration - v_restored_amount;
    end if;
  end if;

  -- Restore debt in LIFO order (newest debts first), matching current UI behavior.
  if v_remaining_restoration > v_tolerance
     and v_payment.order_id is null
     and v_payment.sale_id is null then
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
          ),
          amount_paid = greatest(0, coalesce(amount_paid, 0) - v_restore_amount)
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
          ),
          amount_paid = greatest(0, coalesce(amount_paid, 0) - v_restore_amount)
          where id = v_sale.id;

          v_remaining_restoration := v_remaining_restoration - v_restore_amount;
          v_restored_amount := v_restored_amount + v_restore_amount;
        end;
      end if;
    end if;
  end loop;
  end if;

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
