-- ============================================================================
-- Catchus - Product size inventory (S, M, L, XL)
-- Apply after shopping_cart.sql, checkout_orders.sql, customer_auth.sql, and
-- commerce_extensions.sql. Existing products keep their aggregate stock until
-- an admin enables at least one size.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.product_size_inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null,
  stock integer not null default 0,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_size_inventory_product_size_key unique (product_id, size),
  constraint product_size_inventory_size_valid check (size in ('S', 'M', 'L', 'XL')),
  constraint product_size_inventory_stock_nonnegative check (stock >= 0)
);

comment on table public.product_size_inventory is
  'Per-size product inventory. Only S, M, L, and XL are supported.';

create index if not exists idx_product_size_inventory_product_id
  on public.product_size_inventory (product_id);
create index if not exists idx_product_size_inventory_enabled
  on public.product_size_inventory (product_id, size)
  where is_enabled = true;

create or replace function public.set_product_size_inventory_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_product_size_inventory_updated_at
  on public.product_size_inventory;
create trigger trg_product_size_inventory_updated_at
  before update on public.product_size_inventory
  for each row execute function public.set_product_size_inventory_updated_at();

-- Keep products.stock useful to existing catalog cards and shipping code. When
-- a product has enabled sizes it is the sum of those sizes. If no size is
-- enabled, aggregate stock remains the legacy source of truth.
create or replace function public.sync_product_stock_from_sizes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid := coalesce(new.product_id, old.product_id);
  v_stock integer;
begin
  select sum(stock)::integer
  into v_stock
  from public.product_size_inventory
  where product_id = v_product_id
    and is_enabled = true;

  if v_stock is not null then
    update public.products set stock = v_stock where id = v_product_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_product_size_inventory_sync_stock
  on public.product_size_inventory;
create trigger trg_product_size_inventory_sync_stock
  after insert or update of stock, is_enabled or delete
  on public.product_size_inventory
  for each row execute function public.sync_product_stock_from_sizes();

alter table public.product_size_inventory enable row level security;
revoke all on table public.product_size_inventory from anon, authenticated;
grant select on table public.product_size_inventory to anon, authenticated;
grant insert, update, delete on table public.product_size_inventory to authenticated;

drop policy if exists "Public read active product sizes" on public.product_size_inventory;
create policy "Public read active product sizes"
  on public.product_size_inventory for select
  to anon, authenticated
  using (
    is_enabled = true
    and exists (
      select 1 from public.products
      where products.id = product_size_inventory.product_id
        and products.status = 'active'
    )
  );

drop policy if exists "Admins read all product sizes" on public.product_size_inventory;
create policy "Admins read all product sizes"
  on public.product_size_inventory for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins insert product sizes" on public.product_size_inventory;
create policy "Admins insert product sizes"
  on public.product_size_inventory for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins update product sizes" on public.product_size_inventory;
create policy "Admins update product sizes"
  on public.product_size_inventory for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins delete product sizes" on public.product_size_inventory;
create policy "Admins delete product sizes"
  on public.product_size_inventory for delete
  to authenticated
  using ((select public.is_admin()));

revoke execute on function public.set_product_size_inventory_updated_at()
  from public, anon, authenticated;
revoke execute on function public.sync_product_stock_from_sizes()
  from public, anon, authenticated;

-- New cart/order writes accept only the four supported size values. NOT VALID
-- deliberately preserves any historical rows without silently rewriting them.
alter table public.cart_items
  drop constraint if exists cart_items_selected_size_valid;
alter table public.cart_items
  add constraint cart_items_selected_size_valid
  check (selected_size is null or selected_size in ('S', 'M', 'L', 'XL')) not valid;

alter table public.order_items
  drop constraint if exists order_items_selected_size_valid;
alter table public.order_items
  add constraint order_items_selected_size_valid
  check (selected_size is null or selected_size in ('S', 'M', 'L', 'XL')) not valid;

-- A size reservation flag distinguishes the new checkout-time size deduction
-- from legacy aggregate stock, which continues to deduct only when paid.
alter table public.order_items
  add column if not exists size_stock_reserved boolean not null default false;

alter table public.cart_items
  drop constraint if exists cart_items_cart_product_key;
drop index if exists public.cart_items_cart_product_variant_key;
create unique index cart_items_cart_product_variant_key
  on public.cart_items (
    cart_id,
    product_id,
    coalesce(selected_size, ''),
    coalesce(selected_color, '')
  );

drop function if exists public.get_active_product_stock_for_cart(uuid);
create or replace function public.get_active_product_stock_for_cart(
  p_product_id uuid,
  p_selected_size text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_stock integer;
  v_size text := nullif(upper(btrim(p_selected_size)), '');
  v_size_stock integer;
  v_has_sizes boolean;
begin
  select products.stock
  into v_product_stock
  from public.products
  where products.id = p_product_id
    and products.status = 'active'
  for share;

  if not found then
    raise exception using errcode = 'P0002', message = 'Product is not available.';
  end if;

  select exists (
    select 1 from public.product_size_inventory
    where product_id = p_product_id and is_enabled = true
  ) into v_has_sizes;

  if v_has_sizes then
    if v_size is null then
      raise exception using errcode = '22023', message = 'A size must be selected.';
    end if;
    if v_size not in ('S', 'M', 'L', 'XL') then
      raise exception using errcode = '22023', message = 'Selected size is not available.';
    end if;

    select stock into v_size_stock
    from public.product_size_inventory
    where product_id = p_product_id
      and size = v_size
      and is_enabled = true
    for share;

    if not found then
      raise exception using errcode = '22023', message = 'Selected size is not available.';
    end if;
    return v_size_stock;
  end if;

  if v_size is not null then
    raise exception using errcode = '22023', message = 'Selected size is not available.';
  end if;
  return v_product_stock;
end;
$$;

create or replace function public.validate_cart_item_quantity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_stock integer;
begin
  new.selected_size := nullif(upper(btrim(new.selected_size)), '');
  v_stock := public.get_active_product_stock_for_cart(new.product_id, new.selected_size);
  if new.quantity > v_stock then
    raise exception using errcode = '22023', message = 'Requested quantity exceeds available stock for the selected size.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cart_items_validate_quantity on public.cart_items;
create trigger trg_cart_items_validate_quantity
  before insert or update of product_id, selected_size, quantity on public.cart_items
  for each row execute function public.validate_cart_item_quantity();

drop function if exists public.add_cart_item(uuid, integer);
create or replace function public.add_cart_item(
  p_product_id uuid,
  p_quantity integer default 1,
  p_selected_size text default null
)
returns public.cart_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_cart_id uuid;
  v_size text := nullif(upper(btrim(p_selected_size)), '');
  v_stock integer;
  v_item public.cart_items;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;
  if p_quantity < 1 then
    raise exception using errcode = '22023', message = 'Quantity must be at least 1.';
  end if;

  v_stock := public.get_active_product_stock_for_cart(p_product_id, v_size);
  if p_quantity > v_stock then
    raise exception using errcode = '22023', message = 'Requested quantity exceeds available stock for the selected size.';
  end if;

  insert into public.carts (user_id)
  values (v_user_id)
  on conflict (user_id) do update set updated_at = now()
  returning id into v_cart_id;

  select * into v_item
  from public.cart_items
  where cart_id = v_cart_id
    and product_id = p_product_id
    and selected_size is not distinct from v_size
    and selected_color is null
  for update;

  if found then
    if v_item.quantity + p_quantity > v_stock then
      raise exception using errcode = '22023', message = 'Requested quantity exceeds available stock for the selected size.';
    end if;
    update public.cart_items
    set quantity = quantity + p_quantity
    where id = v_item.id
    returning * into v_item;
  else
    insert into public.cart_items (cart_id, product_id, quantity, selected_size)
    values (v_cart_id, p_product_id, p_quantity, v_size)
    returning * into v_item;
  end if;

  return v_item;
end;
$$;

create or replace function public.update_cart_item_quantity(
  p_cart_item_id uuid,
  p_quantity integer
)
returns public.cart_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_product_id uuid;
  v_selected_size text;
  v_stock integer;
  v_item public.cart_items;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;
  if p_quantity < 1 then
    raise exception using errcode = '22023', message = 'Quantity must be at least 1.';
  end if;

  select cart_items.product_id, cart_items.selected_size
  into v_product_id, v_selected_size
  from public.cart_items
  join public.carts on carts.id = cart_items.cart_id
  where cart_items.id = p_cart_item_id
    and carts.user_id = auth.uid()
  for update of cart_items;

  if not found then
    raise exception using errcode = 'P0002', message = 'Cart item is not available.';
  end if;

  v_stock := public.get_active_product_stock_for_cart(v_product_id, v_selected_size);
  if p_quantity > v_stock then
    raise exception using errcode = '22023', message = 'Requested quantity exceeds available stock for the selected size.';
  end if;

  update public.cart_items set quantity = p_quantity
  where id = p_cart_item_id returning * into v_item;
  return v_item;
end;
$$;

revoke all on function public.get_active_product_stock_for_cart(uuid, text)
  from public, anon;
grant execute on function public.get_active_product_stock_for_cart(uuid, text)
  to authenticated;
revoke all on function public.add_cart_item(uuid, integer, text)
  from public, anon;
grant execute on function public.add_cart_item(uuid, integer, text)
  to authenticated;

-- Reserve and deduct only the selected size when an order item is created by
-- the existing transactional checkout RPC. Legacy products remain untouched.
create or replace function public.reserve_order_item_size_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_size text := nullif(upper(btrim(new.selected_size)), '');
  v_has_sizes boolean;
  v_stock integer;
begin
  if new.product_id is null then return new; end if;

  select exists (
    select 1 from public.product_size_inventory
    where product_id = new.product_id and is_enabled = true
  ) into v_has_sizes;

  if not v_has_sizes then
    if v_size is not null then
      raise exception using errcode = '22023', message = 'Selected size is not available.';
    end if;
    return new;
  end if;

  if v_size is null then
    raise exception using errcode = '22023', message = 'A size must be selected.';
  end if;

  select stock into v_stock
  from public.product_size_inventory
  where product_id = new.product_id
    and size = v_size
    and is_enabled = true
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Selected size is not available.';
  end if;
  if new.quantity > v_stock then
    raise exception using errcode = '22023', message = 'Requested quantity exceeds available stock for the selected size.';
  end if;

  update public.product_size_inventory
  set stock = stock - new.quantity
  where product_id = new.product_id
    and size = v_size
    and is_enabled = true
    and stock >= new.quantity;
  if not found then
    raise exception using errcode = '22023', message = 'Requested quantity exceeds available stock for the selected size.';
  end if;

  new.selected_size := v_size;
  new.size_stock_reserved := true;
  update public.products
  set status = case when stock <= 0 then 'out_of_stock' else status end
  where id = new.product_id;
  return new;
end;
$$;

drop trigger if exists trg_order_items_reserve_size_stock on public.order_items;
create trigger trg_order_items_reserve_size_stock
  before insert on public.order_items
  for each row execute function public.reserve_order_item_size_stock();

-- Legacy products still deduct on payment. Size-managed items were already
-- reserved atomically at checkout and must not be deducted twice.
create or replace function public.decrement_stock_when_payment_becomes_paid()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_item record;
begin
  if old.payment_status <> 'paid' and new.payment_status = 'paid' then
    for v_item in
      select order_items.product_id, order_items.quantity,
        order_items.size_stock_reserved, products.stock
      from public.order_items
      join public.products on products.id = order_items.product_id
      where order_items.order_id = new.id and order_items.product_id is not null
      for update of products
    loop
      if v_item.size_stock_reserved then continue; end if;
      if v_item.stock < v_item.quantity then
        raise exception using errcode = '22023', message = 'Jumlah produk melebihi stok yang tersedia.';
      end if;
      update public.products
      set stock = stock - v_item.quantity,
          status = case when stock - v_item.quantity <= 0 then 'out_of_stock' else status end
      where id = v_item.product_id and stock >= v_item.quantity;
      if not found then
        raise exception using errcode = '22023', message = 'Jumlah produk melebihi stok yang tersedia.';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

-- Cancellation returns a reserved size regardless of payment state. Legacy
-- aggregate inventory is returned only when it had been deducted on payment.
create or replace function public.admin_update_order(
  p_order_id uuid,
  p_action text,
  p_rejection_reason text default null
)
returns public.orders language plpgsql security definer set search_path = ''
as $$
declare v_order public.orders; v_item record;
begin
  if auth.uid() is null or not public.is_admin() then raise exception using errcode = '42501', message = 'Admin access required.'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Order not found.'; end if;

  if p_action = 'approve_payment' and v_order.payment_status = 'waiting_verification' and v_order.order_status = 'waiting_verification' then
    update public.orders set payment_status = 'paid', order_status = 'paid', payment_rejection_reason = null
      where id = p_order_id returning * into v_order;
  elsif p_action = 'reject_payment' and v_order.payment_status = 'waiting_verification' and v_order.order_status = 'waiting_verification' then
    if nullif(btrim(p_rejection_reason), '') is null then raise exception using errcode = '22023', message = 'Alasan penolakan wajib diisi.'; end if;
    update public.orders set payment_status = 'rejected', order_status = 'pending_payment',
      payment_rejection_reason = btrim(p_rejection_reason)
      where id = p_order_id returning * into v_order;
  elsif p_action = 'mark_processing' and v_order.order_status = 'paid' then
    update public.orders set order_status = 'processing' where id = p_order_id returning * into v_order;
  elsif p_action = 'mark_shipped' and v_order.order_status = 'processing' then
    update public.orders set order_status = 'shipped' where id = p_order_id returning * into v_order;
  elsif p_action = 'mark_completed' and v_order.order_status = 'shipped' then
    update public.orders set order_status = 'completed' where id = p_order_id returning * into v_order;
  elsif p_action = 'cancel_order' and v_order.order_status not in ('completed', 'cancelled') then
    for v_item in
      select product_id, selected_size, quantity, size_stock_reserved
      from public.order_items
      where order_id = p_order_id and product_id is not null
    loop
      if v_item.size_stock_reserved then
        update public.product_size_inventory
        set stock = stock + v_item.quantity
        where product_id = v_item.product_id and size = v_item.selected_size;
        update public.products
        set status = case when status = 'out_of_stock' and stock > 0 then 'active' else status end
        where id = v_item.product_id;
      elsif v_order.payment_status = 'paid' then
        update public.products set stock = stock + v_item.quantity,
          status = case when status = 'out_of_stock' then 'active' else status end
        where id = v_item.product_id;
      end if;
    end loop;
    if v_order.voucher_id is not null then
      delete from public.voucher_usages where order_id = p_order_id;
      update public.vouchers set used_count = greatest(used_count - 1, 0) where id = v_order.voucher_id;
    end if;
    update public.orders set order_status = 'cancelled' where id = p_order_id returning * into v_order;
  else raise exception using errcode = '22023', message = 'Invalid order status transition.';
  end if;
  return v_order;
end;
$$;

revoke execute on function public.reserve_order_item_size_stock()
  from public, anon, authenticated;
revoke all on function public.admin_update_order(uuid, text, text) from public, anon;
grant execute on function public.admin_update_order(uuid, text, text) to authenticated;
