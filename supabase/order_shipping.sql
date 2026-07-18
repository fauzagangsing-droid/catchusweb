-- ============================================================================
-- Catchus - Manual order shipping management
-- Run after supabase/checkout_polish.sql. Safe to re-run.
-- ============================================================================

alter table public.orders
  add column if not exists shipping_courier text,
  add column if not exists tracking_number text;

alter table public.orders
  drop constraint if exists orders_shipping_courier_valid,
  drop constraint if exists orders_tracking_number_not_blank;

alter table public.orders
  add constraint orders_shipping_courier_valid check (
    shipping_courier is null or shipping_courier in ('jnt_express', 'jne')
  ),
  add constraint orders_tracking_number_not_blank check (
    tracking_number is null or btrim(tracking_number) <> ''
  );

-- The customer selects the courier as part of checkout. Replacing the
-- previous signature prevents an order from being created without it.
drop function if exists public.place_order(
  text, text, text, text, text, text, text
);

create or replace function public.place_order(
  p_payment_method text,
  p_shipping_full_name text,
  p_shipping_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_province text,
  p_shipping_postal_code text,
  p_shipping_courier text
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
    raise exception using errcode = '42501', message = 'Silakan masuk untuk melanjutkan.';
  end if;

  if p_payment_method not in ('qris', 'dana', 'bank_transfer') then
    raise exception using errcode = '22023', message = 'Pilih metode pembayaran yang valid.';
  end if;

  if p_shipping_courier is null
    or p_shipping_courier not in ('jnt_express', 'jne') then
    raise exception using errcode = '22023', message = 'Pilih kurir yang valid.';
  end if;

  if char_length(btrim(p_shipping_full_name)) < 2
    or char_length(btrim(p_shipping_phone)) < 8
    or char_length(btrim(p_shipping_address)) < 8
    or char_length(btrim(p_shipping_city)) < 2
    or char_length(btrim(p_shipping_province)) < 2
    or char_length(btrim(p_shipping_postal_code)) < 4 then
    raise exception using errcode = '22023', message = 'Lengkapi seluruh informasi pengiriman.';
  end if;

  select users.email into v_customer_email
  from auth.users as users
  where users.id = v_user_id;

  if v_customer_email is null then
    raise exception using errcode = 'P0002', message = 'Email pelanggan tidak tersedia.';
  end if;

  select settings.shipping_cost into v_shipping_cost
  from public.payment_settings as settings
  where settings.id = 1
    and (
      (p_payment_method = 'qris'
        and settings.qris_merchant_name is not null
        and settings.qris_image_url is not null)
      or (p_payment_method = 'dana'
        and settings.dana_account_name is not null
        and settings.dana_number is not null)
      or (p_payment_method = 'bank_transfer'
        and settings.bank_name is not null
        and settings.bank_account_holder is not null
        and settings.bank_account_number is not null)
    );

  if not found then
    raise exception using errcode = 'P0002', message = 'Metode pembayaran belum dikonfigurasi.';
  end if;

  select carts.id into v_cart_id
  from public.carts
  where carts.user_id = v_user_id
  for update;

  if not found or not exists (
    select 1 from public.cart_items where cart_id = v_cart_id
  ) then
    raise exception using errcode = 'P0002', message = 'Keranjang Anda kosong.';
  end if;

  insert into public.orders (
    order_number, user_id, customer_email, shipping_full_name, shipping_phone,
    shipping_address, shipping_city, shipping_province, shipping_postal_code,
    shipping_courier, subtotal, shipping_cost, total, payment_method
  ) values (
    'CTH-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' ||
      lpad(nextval('public.order_number_sequence')::text, 6, '0'),
    v_user_id, v_customer_email, btrim(p_shipping_full_name),
    btrim(p_shipping_phone), btrim(p_shipping_address), btrim(p_shipping_city),
    btrim(p_shipping_province), btrim(p_shipping_postal_code),
    p_shipping_courier, 0, v_shipping_cost, v_shipping_cost, p_payment_method
  ) returning * into v_order;

  for v_cart_item in
    select
      cart_items.product_id, cart_items.quantity, cart_items.selected_size,
      cart_items.selected_color, products.name, products.slug, products.price,
      products.stock, products.status,
      (select product_images.image_url
       from public.product_images
       where product_images.product_id = products.id
       order by product_images.is_thumbnail desc, product_images.created_at asc
       limit 1) as image_url
    from public.cart_items
    join public.products on products.id = cart_items.product_id
    where cart_items.cart_id = v_cart_id
    order by cart_items.created_at
    for update of products
  loop
    if v_cart_item.status <> 'active' then
      raise exception using errcode = 'P0002', message = 'Produk di keranjang sudah tidak tersedia.';
    end if;

    if v_cart_item.quantity > v_cart_item.stock then
      raise exception using errcode = '22023', message = 'Jumlah produk di keranjang melebihi stok.';
    end if;

    v_item_subtotal := v_cart_item.price * v_cart_item.quantity;
    v_subtotal := v_subtotal + v_item_subtotal;

    insert into public.order_items (
      order_id, product_id, product_name, product_slug, product_image_url,
      selected_size, selected_color, quantity, unit_price, subtotal
    ) values (
      v_order.id, v_cart_item.product_id, v_cart_item.name, v_cart_item.slug,
      v_cart_item.image_url, v_cart_item.selected_size, v_cart_item.selected_color,
      v_cart_item.quantity, v_cart_item.price, v_item_subtotal
    );

    update public.products
    set stock = stock - v_cart_item.quantity,
      status = case when stock - v_cart_item.quantity = 0
        then 'out_of_stock' else status end
    where id = v_cart_item.product_id;
  end loop;

  update public.orders
  set subtotal = v_subtotal, total = v_subtotal + v_shipping_cost
  where id = v_order.id
  returning * into v_order;

  delete from public.cart_items where cart_id = v_cart_id;
  return v_order;
end;
$$;

revoke all on function public.place_order(
  text, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.place_order(
  text, text, text, text, text, text, text, text
) to authenticated;

-- Any transition into shipped must carry complete shipping details. Existing
-- historical shipped/completed rows remain readable and can still progress.
create or replace function public.validate_order_shipping_details()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_status = 'shipped'
    and (new.shipping_courier is null or new.tracking_number is null) then
    raise exception using
      errcode = '22023',
      message = 'Kurir dan nomor resi wajib diisi sebelum pesanan dikirim.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_orders_validate_shipping_details on public.orders;
create trigger trg_orders_validate_shipping_details
  before update of order_status, shipping_courier, tracking_number
  on public.orders
  for each row execute function public.validate_order_shipping_details();

drop function if exists public.admin_save_order_shipping(uuid, text, text);

create or replace function public.admin_save_order_shipping(
  p_order_id uuid,
  p_tracking_number text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'Akses admin diperlukan.';
  end if;

  if p_tracking_number is null or btrim(p_tracking_number) = '' then
    raise exception using errcode = '22023', message = 'Nomor resi wajib diisi.';
  end if;

  update public.orders
  set
    tracking_number = btrim(p_tracking_number),
    order_status = 'shipped'
  where id = p_order_id
    and order_status = 'processing'
    and shipping_courier is not null
  returning * into v_order;

  if v_order.id is null then
    raise exception using
      errcode = '22023',
      message = 'Pesanan harus sedang diproses dan memiliki kurir pilihan pelanggan.';
  end if;

  return v_order;
end;
$$;

revoke all on function public.admin_save_order_shipping(uuid, text)
  from public, anon;
grant execute on function public.admin_save_order_shipping(uuid, text)
  to authenticated;
revoke execute on function public.validate_order_shipping_details()
  from public, anon, authenticated;
