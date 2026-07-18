-- ============================================================================
-- Catchus - Phase 7 Checkout, Manual Payment, and Order Management
-- Run after supabase/shopping_cart.sql. Safe to re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.payment_settings (
  id smallint primary key default 1,
  dana_account_name text,
  dana_number text,
  bank_name text,
  bank_account_holder text,
  bank_account_number text,
  shipping_cost numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now(),
  constraint payment_settings_singleton check (id = 1),
  constraint payment_settings_shipping_cost_nonnegative check (shipping_cost >= 0),
  constraint payment_settings_dana_name_not_blank check (
    dana_account_name is null or btrim(dana_account_name) <> ''
  ),
  constraint payment_settings_dana_number_not_blank check (
    dana_number is null or btrim(dana_number) <> ''
  ),
  constraint payment_settings_bank_name_not_blank check (
    bank_name is null or btrim(bank_name) <> ''
  ),
  constraint payment_settings_bank_holder_not_blank check (
    bank_account_holder is null or btrim(bank_account_holder) <> ''
  ),
  constraint payment_settings_bank_number_not_blank check (
    bank_account_number is null or btrim(bank_account_number) <> ''
  )
);

insert into public.payment_settings (id)
values (1)
on conflict (id) do nothing;

create sequence if not exists public.order_number_sequence start 1;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  customer_email text not null,
  shipping_full_name text not null,
  shipping_phone text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_province text not null,
  shipping_postal_code text not null,
  subtotal numeric(12, 2) not null,
  shipping_cost numeric(12, 2) not null,
  total numeric(12, 2) not null,
  payment_method text not null,
  payment_status text not null default 'pending',
  order_status text not null default 'pending_payment',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_subtotal_nonnegative check (subtotal >= 0),
  constraint orders_shipping_cost_nonnegative check (shipping_cost >= 0),
  constraint orders_total_valid check (total = subtotal + shipping_cost),
  constraint orders_payment_method_valid check (
    payment_method in ('dana', 'bank_transfer')
  ),
  constraint orders_payment_status_valid check (
    payment_status in ('pending', 'waiting_verification', 'paid', 'rejected')
  ),
  constraint orders_order_status_valid check (
    order_status in (
      'pending_payment',
      'waiting_verification',
      'paid',
      'processing',
      'shipped',
      'completed',
      'cancelled'
    )
  )
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  product_slug text not null,
  product_image_url text,
  selected_size text,
  selected_color text,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  subtotal numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint order_items_quantity_positive check (quantity >= 1),
  constraint order_items_unit_price_nonnegative check (unit_price >= 0),
  constraint order_items_subtotal_valid check (subtotal = unit_price * quantity)
);

create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_payment_status on public.orders (payment_status);
create index if not exists idx_orders_order_status on public.orders (order_status);
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_order_items_product_id on public.order_items (product_id);

create or replace function public.set_order_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orders_set_updated_at on public.orders;
create trigger trg_orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_order_updated_at();

drop trigger if exists trg_payment_settings_set_updated_at on public.payment_settings;
create trigger trg_payment_settings_set_updated_at
  before update on public.payment_settings
  for each row execute function public.set_order_updated_at();

alter table public.payment_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on table public.payment_settings from anon;
revoke all on table public.orders from anon;
revoke all on table public.order_items from anon;
grant select on table public.payment_settings to authenticated;
grant select on table public.orders to authenticated;
grant select on table public.order_items to authenticated;
grant insert, update on table public.payment_settings to authenticated;

drop policy if exists "Authenticated read payment settings" on public.payment_settings;
create policy "Authenticated read payment settings" on public.payment_settings
  for select to authenticated using (id = 1);

drop policy if exists "Admins insert payment settings" on public.payment_settings;
create policy "Admins insert payment settings" on public.payment_settings
  for insert to authenticated
  with check (id = 1 and (select public.is_admin()));

drop policy if exists "Admins update payment settings" on public.payment_settings;
create policy "Admins update payment settings" on public.payment_settings
  for update to authenticated
  using (id = 1 and (select public.is_admin()))
  with check (id = 1 and (select public.is_admin()));

drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders" on public.orders
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Admins read all orders" on public.orders;
create policy "Admins read all orders" on public.orders
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items" on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins read all order items" on public.order_items;
create policy "Admins read all order items" on public.order_items
  for select to authenticated
  using ((select public.is_admin()));

create or replace function public.place_order(
  p_payment_method text,
  p_shipping_full_name text,
  p_shipping_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_province text,
  p_shipping_postal_code text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_email text;
  v_cart_id uuid;
  v_order public.orders;
  v_cart_item record;
  v_subtotal numeric(12, 2) := 0;
  v_shipping_cost numeric(12, 2);
  v_item_subtotal numeric(12, 2);
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if p_payment_method not in ('dana', 'bank_transfer') then
    raise exception using errcode = '22023', message = 'Select a valid payment method.';
  end if;

  if char_length(btrim(p_shipping_full_name)) < 2
    or char_length(btrim(p_shipping_phone)) < 8
    or char_length(btrim(p_shipping_address)) < 8
    or char_length(btrim(p_shipping_city)) < 2
    or char_length(btrim(p_shipping_province)) < 2
    or char_length(btrim(p_shipping_postal_code)) < 4 then
    raise exception using errcode = '22023', message = 'Complete all shipping information.';
  end if;

  select users.email
  into v_customer_email
  from auth.users as users
  where users.id = v_user_id;

  if v_customer_email is null then
    raise exception using errcode = 'P0002', message = 'Customer email is unavailable.';
  end if;

  select settings.shipping_cost
  into v_shipping_cost
  from public.payment_settings as settings
  where settings.id = 1
    and (
      (
        p_payment_method = 'dana'
        and settings.dana_account_name is not null
        and settings.dana_number is not null
      )
      or (
        p_payment_method = 'bank_transfer'
        and settings.bank_name is not null
        and settings.bank_account_holder is not null
        and settings.bank_account_number is not null
      )
    );

  if not found then
    raise exception using errcode = 'P0002', message = 'Payment method is not configured.';
  end if;

  select carts.id
  into v_cart_id
  from public.carts
  where carts.user_id = v_user_id
  for update;

  if not found or not exists (
    select 1 from public.cart_items where cart_id = v_cart_id
  ) then
    raise exception using errcode = 'P0002', message = 'Your cart is empty.';
  end if;

  insert into public.orders (
    order_number,
    user_id,
    customer_email,
    shipping_full_name,
    shipping_phone,
    shipping_address,
    shipping_city,
    shipping_province,
    shipping_postal_code,
    subtotal,
    shipping_cost,
    total,
    payment_method
  ) values (
    'CTH-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' ||
      lpad(nextval('public.order_number_sequence')::text, 6, '0'),
    v_user_id,
    v_customer_email,
    btrim(p_shipping_full_name),
    btrim(p_shipping_phone),
    btrim(p_shipping_address),
    btrim(p_shipping_city),
    btrim(p_shipping_province),
    btrim(p_shipping_postal_code),
    0,
    v_shipping_cost,
    v_shipping_cost,
    p_payment_method
  ) returning * into v_order;

  for v_cart_item in
    select
      cart_items.product_id,
      cart_items.quantity,
      cart_items.selected_size,
      cart_items.selected_color,
      products.name,
      products.slug,
      products.price,
      products.stock,
      products.status,
      (
        select product_images.image_url
        from public.product_images
        where product_images.product_id = products.id
        order by product_images.is_thumbnail desc, product_images.created_at asc
        limit 1
      ) as image_url
    from public.cart_items
    join public.products on products.id = cart_items.product_id
    where cart_items.cart_id = v_cart_id
    order by cart_items.created_at
    for update of products
  loop
    if v_cart_item.status <> 'active' then
      raise exception using errcode = 'P0002', message = 'A product in your cart is no longer available.';
    end if;

    if v_cart_item.quantity > v_cart_item.stock then
      raise exception using errcode = '22023', message = 'A product in your cart exceeds available stock.';
    end if;

    v_item_subtotal := v_cart_item.price * v_cart_item.quantity;
    v_subtotal := v_subtotal + v_item_subtotal;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      product_slug,
      product_image_url,
      selected_size,
      selected_color,
      quantity,
      unit_price,
      subtotal
    ) values (
      v_order.id,
      v_cart_item.product_id,
      v_cart_item.name,
      v_cart_item.slug,
      v_cart_item.image_url,
      v_cart_item.selected_size,
      v_cart_item.selected_color,
      v_cart_item.quantity,
      v_cart_item.price,
      v_item_subtotal
    );

    update public.products
    set
      stock = stock - v_cart_item.quantity,
      status = case
        when stock - v_cart_item.quantity = 0 then 'out_of_stock'
        else status
      end
    where id = v_cart_item.product_id;
  end loop;

  update public.orders
  set
    subtotal = v_subtotal,
    total = v_subtotal + v_shipping_cost
  where id = v_order.id
  returning * into v_order;

  delete from public.cart_items where cart_id = v_cart_id;

  return v_order;
end;
$$;

create or replace function public.mark_order_paid(p_order_number text)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  update public.orders
  set
    payment_status = 'waiting_verification',
    order_status = 'waiting_verification'
  where order_number = p_order_number
    and user_id = auth.uid()
    and payment_status in ('pending', 'rejected')
    and order_status = 'pending_payment'
  returning * into v_order;

  if v_order.id is null then
    raise exception using errcode = '22023', message = 'This order cannot be submitted for verification.';
  end if;

  return v_order;
end;
$$;

create or replace function public.admin_update_order(
  p_order_id uuid,
  p_action text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_item record;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'Admin access required.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Order not found.';
  end if;

  if p_action = 'approve_payment'
    and v_order.payment_status = 'waiting_verification'
    and v_order.order_status = 'waiting_verification' then
    update public.orders
    set payment_status = 'paid', order_status = 'paid'
    where id = p_order_id returning * into v_order;
  elsif p_action = 'reject_payment'
    and v_order.payment_status = 'waiting_verification'
    and v_order.order_status = 'waiting_verification' then
    update public.orders
    set payment_status = 'rejected', order_status = 'pending_payment'
    where id = p_order_id returning * into v_order;
  elsif p_action = 'mark_processing' and v_order.order_status = 'paid' then
    update public.orders set order_status = 'processing'
    where id = p_order_id returning * into v_order;
  elsif p_action = 'mark_shipped' and v_order.order_status = 'processing' then
    update public.orders set order_status = 'shipped'
    where id = p_order_id returning * into v_order;
  elsif p_action = 'mark_completed' and v_order.order_status = 'shipped' then
    update public.orders set order_status = 'completed'
    where id = p_order_id returning * into v_order;
  elsif p_action = 'cancel_order'
    and v_order.order_status not in ('completed', 'cancelled') then
    for v_item in
      select product_id, quantity
      from public.order_items
      where order_id = p_order_id and product_id is not null
    loop
      update public.products
      set
        stock = stock + v_item.quantity,
        status = case when status = 'out_of_stock' then 'active' else status end
      where id = v_item.product_id;
    end loop;

    update public.orders set order_status = 'cancelled'
    where id = p_order_id returning * into v_order;
  else
    raise exception using errcode = '22023', message = 'Invalid order status transition.';
  end if;

  return v_order;
end;
$$;

revoke all on function public.place_order(text, text, text, text, text, text, text) from public, anon;
revoke all on function public.mark_order_paid(text) from public, anon;
revoke all on function public.admin_update_order(uuid, text) from public, anon;
grant execute on function public.place_order(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.mark_order_paid(text) to authenticated;
grant execute on function public.admin_update_order(uuid, text) to authenticated;
revoke execute on function public.set_order_updated_at() from public, anon, authenticated;
