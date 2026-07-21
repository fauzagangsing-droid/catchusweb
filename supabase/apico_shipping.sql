-- ============================================================================
-- Catchus - API.co.id regional addresses and immutable shipping quotes
-- Run after supabase/order_shipping.sql. Safe to re-run.
-- ============================================================================

create table if not exists public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipient_name text not null,
  phone text not null,
  province_name text not null,
  city_name text not null,
  district_name text not null,
  village_name text not null,
  postal_code text not null,
  full_address text not null,
  label text not null default 'home',
  province_code text not null,
  city_code text not null,
  district_code text not null,
  village_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_addresses_recipient_not_blank check (btrim(recipient_name) <> ''),
  constraint shipping_addresses_phone_not_blank check (btrim(phone) <> ''),
  constraint shipping_addresses_postal_code_valid check (postal_code ~ '^[0-9]{4,10}$'),
  constraint shipping_addresses_full_address_not_blank check (btrim(full_address) <> ''),
  constraint shipping_addresses_label_valid check (label in ('home', 'office', 'other')),
  constraint shipping_addresses_province_code_valid check (province_code ~ '^[0-9]{2}$'),
  constraint shipping_addresses_city_code_valid check (city_code ~ '^[0-9]{4}$'),
  constraint shipping_addresses_district_code_valid check (district_code ~ '^[0-9]{6,7}$'),
  constraint shipping_addresses_village_code_valid check (village_code ~ '^[0-9]{10}$')
);

create index if not exists idx_shipping_addresses_user_id
  on public.shipping_addresses (user_id, created_at desc);
create unique index if not exists uq_shipping_addresses_one_default
  on public.shipping_addresses (user_id) where is_default = true;

create or replace function public.prepare_shipping_address_default()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.shipping_addresses
    where user_id = new.user_id and id <> new.id
  ) then
    new.is_default := true;
  end if;

  if new.is_default then
    update public.shipping_addresses
    set is_default = false
    where user_id = new.user_id and id <> new.id and is_default = true;
  end if;
  if tg_op = 'UPDATE' and old.is_default and not new.is_default
    and not exists (
      select 1 from public.shipping_addresses
      where user_id = new.user_id and id <> new.id and is_default = true
    ) then
    new.is_default := true;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_shipping_addresses_default on public.shipping_addresses;
create trigger trg_shipping_addresses_default
  before insert or update on public.shipping_addresses
  for each row execute function public.prepare_shipping_address_default();

create or replace function public.promote_shipping_address_default()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_default then
    update public.shipping_addresses
    set is_default = true
    where id = (
      select id from public.shipping_addresses
      where user_id = old.user_id
      order by created_at asc
      limit 1
    );
  end if;
  return old;
end;
$$;

drop trigger if exists trg_shipping_addresses_promote_default on public.shipping_addresses;
create trigger trg_shipping_addresses_promote_default
  after delete on public.shipping_addresses
  for each row execute function public.promote_shipping_address_default();

alter table public.shipping_addresses enable row level security;
revoke all on table public.shipping_addresses from anon;
grant select, insert, update, delete on table public.shipping_addresses to authenticated;

drop policy if exists "Users read own shipping addresses" on public.shipping_addresses;
create policy "Users read own shipping addresses" on public.shipping_addresses
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users create own shipping addresses" on public.shipping_addresses;
create policy "Users create own shipping addresses" on public.shipping_addresses
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own shipping addresses" on public.shipping_addresses;
create policy "Users update own shipping addresses" on public.shipping_addresses
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own shipping addresses" on public.shipping_addresses;
create policy "Users delete own shipping addresses" on public.shipping_addresses
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Product weights are kilograms and are mandatory for shipment calculation.
alter table public.products add column if not exists weight numeric(5, 2);
update public.products set weight = 0.30 where weight is null;
alter table public.products
  alter column weight type numeric(5, 2) using weight::numeric(5, 2);
alter table public.products alter column weight set default 0.30;
alter table public.products alter column weight set not null;
alter table public.products drop constraint if exists products_weight_nonnegative;
alter table public.products drop constraint if exists products_weight_positive;
alter table public.products
  add constraint products_weight_nonnegative check (weight >= 0);
comment on column public.products.weight is 'Shipping weight per product in kilograms.';

alter table public.orders
  add column if not exists shipping_address_id uuid references public.shipping_addresses (id) on delete set null,
  add column if not exists shipping_address_label text,
  add column if not exists shipping_district text,
  add column if not exists shipping_village text,
  add column if not exists province_code text,
  add column if not exists city_code text,
  add column if not exists district_code text,
  add column if not exists destination_village_code text,
  add column if not exists courier_code text,
  add column if not exists courier_name text,
  add column if not exists shipping_estimation text,
  add column if not exists shipping_weight numeric(10, 3),
  add column if not exists shipping_status text not null default 'pending';

alter table public.orders
  drop constraint if exists orders_shipping_courier_valid,
  drop constraint if exists orders_shipping_address_label_valid,
  drop constraint if exists orders_destination_village_code_valid,
  drop constraint if exists orders_shipping_weight_positive,
  drop constraint if exists orders_shipping_status_valid;

alter table public.orders
  add constraint orders_shipping_address_label_valid check (
    shipping_address_label is null or shipping_address_label in ('home', 'office', 'other')
  ),
  add constraint orders_destination_village_code_valid check (
    destination_village_code is null or destination_village_code ~ '^[0-9]{10}$'
  ),
  add constraint orders_shipping_weight_positive check (
    shipping_weight is null or shipping_weight > 0
  ),
  add constraint orders_shipping_status_valid check (
    shipping_status in ('pending', 'ready_to_ship', 'shipped', 'delivered', 'returned', 'cancelled')
  );

create index if not exists idx_orders_shipping_address_id on public.orders (shipping_address_id);
create index if not exists idx_orders_shipping_status on public.orders (shipping_status);

create or replace function public.protect_order_shipping_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.shipping_full_name is distinct from old.shipping_full_name
    or new.shipping_phone is distinct from old.shipping_phone
    or new.shipping_address is distinct from old.shipping_address
    or new.shipping_city is distinct from old.shipping_city
    or new.shipping_province is distinct from old.shipping_province
    or new.shipping_district is distinct from old.shipping_district
    or new.shipping_village is distinct from old.shipping_village
    or new.shipping_postal_code is distinct from old.shipping_postal_code
    or new.province_code is distinct from old.province_code
    or new.city_code is distinct from old.city_code
    or new.district_code is distinct from old.district_code
    or new.destination_village_code is distinct from old.destination_village_code
    or new.shipping_courier is distinct from old.shipping_courier
    or new.courier_code is distinct from old.courier_code
    or new.courier_name is distinct from old.courier_name
    or new.shipping_cost is distinct from old.shipping_cost
    or new.shipping_estimation is distinct from old.shipping_estimation
    or new.shipping_weight is distinct from old.shipping_weight then
    raise exception using errcode = '22023', message = 'Snapshot pengiriman pesanan tidak dapat diubah.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_protect_shipping_snapshot on public.orders;
create trigger trg_orders_protect_shipping_snapshot
  before update on public.orders
  for each row execute function public.protect_order_shipping_snapshot();

-- The legacy customer-callable RPC used a flat configured fee. Disable it so
-- orders can only be created through the server-verified quote route.
revoke execute on function public.place_order(text, text, text, text, text, text, text, text)
  from authenticated;

create or replace function public.place_order_with_shipping(
  p_user_id uuid,
  p_payment_method text,
  p_address_id uuid,
  p_courier_code text,
  p_courier_name text,
  p_shipping_cost numeric,
  p_shipping_estimation text,
  p_shipping_weight numeric,
  p_destination_village_code text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_email text;
  v_cart_id uuid;
  v_order public.orders;
  v_address public.shipping_addresses;
  v_cart_item record;
  v_subtotal numeric(12, 2) := 0;
  v_item_subtotal numeric(12, 2);
  v_calculated_weight numeric(10, 3);
begin
  if p_user_id is null then
    raise exception using errcode = '42501', message = 'Silakan masuk untuk melanjutkan.';
  end if;
  if p_payment_method not in ('qris', 'dana', 'bank_transfer') then
    raise exception using errcode = '22023', message = 'Pilih metode pembayaran yang valid.';
  end if;
  if p_courier_code is null or btrim(p_courier_code) = ''
    or p_courier_name is null or btrim(p_courier_name) = ''
    or p_shipping_cost is null or p_shipping_cost < 0
    or p_shipping_weight is null or p_shipping_weight <= 0
    or p_destination_village_code !~ '^[0-9]{10}$' then
    raise exception using errcode = '22023', message = 'Pilihan pengiriman tidak valid.';
  end if;

  select users.email into v_customer_email
  from auth.users as users where users.id = p_user_id;
  if v_customer_email is null then
    raise exception using errcode = 'P0002', message = 'Email pelanggan tidak tersedia.';
  end if;

  select * into v_address from public.shipping_addresses
  where id = p_address_id and user_id = p_user_id;
  if not found or v_address.village_code <> p_destination_village_code then
    raise exception using errcode = '22023', message = 'Alamat pengiriman tidak valid.';
  end if;

  if not exists (
    select 1 from public.payment_settings as settings
    where settings.id = 1 and (
      (p_payment_method = 'qris' and settings.qris_merchant_name is not null and settings.qris_image_url is not null)
      or (p_payment_method = 'dana' and settings.dana_account_name is not null and settings.dana_number is not null)
      or (p_payment_method = 'bank_transfer' and settings.bank_name is not null and settings.bank_account_holder is not null and settings.bank_account_number is not null)
    )
  ) then
    raise exception using errcode = 'P0002', message = 'Metode pembayaran belum dikonfigurasi.';
  end if;

  select carts.id into v_cart_id from public.carts
  where carts.user_id = p_user_id for update;
  if not found or not exists (select 1 from public.cart_items where cart_id = v_cart_id) then
    raise exception using errcode = 'P0002', message = 'Keranjang Anda kosong.';
  end if;

  select round(sum(coalesce(products.weight, 0.30) * cart_items.quantity), 3)
  into v_calculated_weight
  from public.cart_items
  join public.products on products.id = cart_items.product_id
  where cart_items.cart_id = v_cart_id;
  if v_calculated_weight is null or abs(v_calculated_weight - p_shipping_weight) > 0.001 then
    raise exception using errcode = '22023', message = 'Berat keranjang berubah. Pilih ulang opsi pengiriman.';
  end if;

  insert into public.orders (
    order_number, user_id, customer_email,
    shipping_address_id, shipping_address_label, shipping_full_name, shipping_phone,
    shipping_address, shipping_city, shipping_province, shipping_district,
    shipping_village, shipping_postal_code, province_code, city_code,
    district_code, destination_village_code, shipping_courier, courier_code,
    courier_name, shipping_estimation, shipping_weight, shipping_status,
    subtotal, shipping_cost, total, payment_method
  ) values (
    'CTH-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' ||
      lpad(nextval('public.order_number_sequence')::text, 6, '0'),
    p_user_id, v_customer_email,
    v_address.id, v_address.label, v_address.recipient_name, v_address.phone,
    v_address.full_address, v_address.city_name, v_address.province_name,
    v_address.district_name, v_address.village_name, v_address.postal_code,
    v_address.province_code, v_address.city_code, v_address.district_code,
    v_address.village_code, btrim(p_courier_code), btrim(p_courier_code),
    btrim(p_courier_name), nullif(btrim(p_shipping_estimation), ''),
    p_shipping_weight, 'pending', 0, p_shipping_cost, p_shipping_cost,
    p_payment_method
  ) returning * into v_order;

  for v_cart_item in
    select
      cart_items.product_id, cart_items.quantity, cart_items.selected_size,
      cart_items.selected_color, products.name, products.slug, products.price,
      products.stock, products.status,
      (select product_images.image_url from public.product_images
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
      status = case when stock - v_cart_item.quantity = 0 then 'out_of_stock' else status end
    where id = v_cart_item.product_id;
  end loop;

  update public.orders set subtotal = v_subtotal, total = v_subtotal + p_shipping_cost
  where id = v_order.id returning * into v_order;
  delete from public.cart_items where cart_id = v_cart_id;
  return v_order;
end;
$$;

revoke all on function public.place_order_with_shipping(
  uuid, text, uuid, text, text, numeric, text, numeric, text
) from public, anon, authenticated;
grant execute on function public.place_order_with_shipping(
  uuid, text, uuid, text, text, numeric, text, numeric, text
) to service_role;

drop function if exists public.admin_save_order_shipping(uuid, text);
create or replace function public.admin_save_order_shipping(
  p_order_id uuid,
  p_tracking_number text,
  p_shipping_status text
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
  if p_shipping_status not in ('pending', 'ready_to_ship', 'shipped', 'delivered', 'returned', 'cancelled') then
    raise exception using errcode = '22023', message = 'Status pengiriman tidak valid.';
  end if;
  if p_shipping_status in ('shipped', 'delivered')
    and (p_tracking_number is null or btrim(p_tracking_number) = '') then
    raise exception using errcode = '22023', message = 'Nomor resi wajib diisi untuk status ini.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.courier_code is null then
    raise exception using errcode = '22023', message = 'Pesanan atau kurir pengiriman tidak valid.';
  end if;
  if p_shipping_status = 'shipped' and v_order.order_status not in ('processing', 'shipped') then
    raise exception using errcode = '22023', message = 'Pesanan harus sedang diproses sebelum dikirim.';
  end if;
  if p_shipping_status = 'delivered' and v_order.order_status not in ('shipped', 'completed') then
    raise exception using errcode = '22023', message = 'Pesanan harus dikirim sebelum ditandai terkirim.';
  end if;

  update public.orders
  set tracking_number = nullif(btrim(p_tracking_number), ''),
      shipping_status = p_shipping_status,
      order_status = case
        when p_shipping_status = 'shipped' and order_status = 'processing' then 'shipped'
        when p_shipping_status = 'delivered' and order_status = 'shipped' then 'completed'
        else order_status
      end
  where id = p_order_id returning * into v_order;
  return v_order;
end;
$$;

revoke all on function public.admin_save_order_shipping(uuid, text, text)
  from public, anon;
grant execute on function public.admin_save_order_shipping(uuid, text, text)
  to authenticated;
revoke execute on function public.prepare_shipping_address_default()
  from public, anon, authenticated;
revoke execute on function public.promote_shipping_address_default()
  from public, anon, authenticated;
revoke execute on function public.protect_order_shipping_snapshot()
  from public, anon, authenticated;
