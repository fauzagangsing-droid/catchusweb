-- ============================================================================
-- Catchus - payment proofs, verified reviews, vouchers, paid-stock workflow
-- Run after apico_shipping.sql. This migration is intended to run once.
-- ============================================================================

create extension if not exists "pgcrypto";

-- PAYMENT PROOF --------------------------------------------------------------
alter table public.orders
  add column if not exists payment_proof_url text,
  add column if not exists payment_uploaded_at timestamptz,
  add column if not exists payment_notes text,
  add column if not exists payment_rejection_reason text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Customers read own payment proofs" on storage.objects;
create policy "Customers read own payment proofs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_admin()
    )
  );

-- VOUCHERS -------------------------------------------------------------------
create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  type text not null,
  value numeric(12, 2) not null,
  minimum_purchase numeric(12, 2) not null default 0,
  maximum_discount numeric(12, 2),
  usage_limit integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vouchers_code_not_blank check (btrim(code) <> ''),
  constraint vouchers_type_valid check (type in ('percentage', 'fixed')),
  constraint vouchers_value_positive check (value > 0),
  constraint vouchers_minimum_nonnegative check (minimum_purchase >= 0),
  constraint vouchers_maximum_positive check (maximum_discount is null or maximum_discount > 0),
  constraint vouchers_usage_valid check (usage_limit is null or usage_limit > 0),
  constraint vouchers_used_count_valid check (used_count >= 0),
  constraint vouchers_dates_valid check (expires_at is null or starts_at is null or expires_at > starts_at),
  constraint vouchers_percentage_valid check (type <> 'percentage' or value <= 100)
);
create unique index if not exists vouchers_code_lower_key on public.vouchers (lower(code));

alter table public.orders
  add column if not exists voucher_id uuid references public.vouchers(id) on delete set null,
  add column if not exists voucher_code text,
  add column if not exists discount_amount numeric(12, 2) not null default 0;
alter table public.orders drop constraint if exists orders_discount_nonnegative;
alter table public.orders add constraint orders_discount_nonnegative check (discount_amount >= 0);

create table if not exists public.voucher_usages (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.vouchers(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (voucher_id, order_id)
);
create index if not exists voucher_usages_user_idx on public.voucher_usages(user_id, created_at desc);

alter table public.vouchers enable row level security;
alter table public.voucher_usages enable row level security;
revoke all on public.vouchers, public.voucher_usages from anon;
grant select on public.vouchers to authenticated;
grant select on public.voucher_usages to authenticated;

drop policy if exists "Customers read active vouchers" on public.vouchers;
create policy "Customers read active vouchers" on public.vouchers
  for select to authenticated using (is_active or public.is_admin());
drop policy if exists "Admins manage vouchers" on public.vouchers;
create policy "Admins manage vouchers" on public.vouchers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Customers read own voucher usage" on public.voucher_usages;
create policy "Customers read own voucher usage" on public.voucher_usages
  for select to authenticated using ((select auth.uid()) = user_id or public.is_admin());

-- PRODUCT REVIEWS ------------------------------------------------------------
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  rating smallint not null,
  review text not null,
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_reviews_rating_valid check (rating between 1 and 5),
  constraint product_reviews_text_valid check (char_length(btrim(review)) between 3 and 2000),
  unique (product_id, user_id)
);
create index if not exists product_reviews_product_idx
  on public.product_reviews(product_id, created_at desc);

alter table public.product_reviews enable row level security;
grant select on public.product_reviews to anon, authenticated;
grant insert, update, delete on public.product_reviews to authenticated;

drop policy if exists "Public read product reviews" on public.product_reviews;
create policy "Public read product reviews" on public.product_reviews
  for select to anon, authenticated using (true);
drop policy if exists "Verified buyers create reviews" on public.product_reviews;
create policy "Verified buyers create reviews" on public.product_reviews
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.orders
      join public.order_items on order_items.order_id = orders.id
      where orders.id = product_reviews.order_id
        and orders.user_id = (select auth.uid())
        and orders.payment_status = 'paid'
        and order_items.product_id = product_reviews.product_id
    )
  );
drop policy if exists "Customers update own reviews" on public.product_reviews;
create policy "Customers update own reviews" on public.product_reviews
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.orders
      join public.order_items on order_items.order_id = orders.id
      where orders.id = product_reviews.order_id
        and orders.user_id = (select auth.uid())
        and orders.payment_status = 'paid'
        and order_items.product_id = product_reviews.product_id
    )
  );
drop policy if exists "Customers delete own reviews" on public.product_reviews;
create policy "Customers delete own reviews" on public.product_reviews
  for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists trg_product_reviews_updated_at on public.product_reviews;
create trigger trg_product_reviews_updated_at before update on public.product_reviews
  for each row execute function public.set_updated_at();
drop trigger if exists trg_vouchers_updated_at on public.vouchers;
create trigger trg_vouchers_updated_at before update on public.vouchers
  for each row execute function public.set_updated_at();

-- Existing unpaid orders were created by the old reservation-at-checkout
-- workflow. Release that stock once before switching to paid-only deduction.
with quantities as (
  select order_items.product_id, sum(order_items.quantity)::integer as quantity
  from public.order_items
  join public.orders on orders.id = order_items.order_id
  where orders.payment_status <> 'paid'
    and orders.order_status <> 'cancelled'
    and order_items.product_id is not null
  group by order_items.product_id
)
update public.products
set stock = products.stock + quantities.quantity,
    status = case when products.status = 'out_of_stock' then 'active' else products.status end
from quantities where products.id = quantities.product_id;

-- ORDER CREATION + ATOMIC VOUCHER USAGE -------------------------------------
drop function if exists public.place_order_with_shipping(
  uuid, text, uuid, text, text, numeric, text, numeric, text
);
create or replace function public.place_order_with_shipping(
  p_user_id uuid,
  p_payment_method text,
  p_address_id uuid,
  p_courier_code text,
  p_courier_name text,
  p_shipping_cost numeric,
  p_shipping_estimation text,
  p_shipping_weight numeric,
  p_destination_village_code text,
  p_voucher_code text default null
)
returns public.orders
language plpgsql security definer set search_path = ''
as $$
declare
  v_customer_email text;
  v_cart_id uuid;
  v_order public.orders;
  v_address public.shipping_addresses;
  v_cart_item record;
  v_voucher public.vouchers;
  v_subtotal numeric(12, 2) := 0;
  v_item_subtotal numeric(12, 2);
  v_discount numeric(12, 2) := 0;
  v_calculated_weight numeric(10, 3);
begin
  if p_user_id is null then raise exception using errcode = '42501', message = 'Silakan masuk untuk melanjutkan.'; end if;
  if p_payment_method not in ('qris', 'dana', 'bank_transfer') then raise exception using errcode = '22023', message = 'Pilih metode pembayaran yang valid.'; end if;
  if p_courier_code is null or btrim(p_courier_code) = '' or p_courier_name is null
    or btrim(p_courier_name) = '' or p_shipping_cost is null or p_shipping_cost < 0
    or p_shipping_weight is null or p_shipping_weight <= 0
    or p_destination_village_code !~ '^[0-9]{10}$' then
    raise exception using errcode = '22023', message = 'Pilihan pengiriman tidak valid.';
  end if;

  select email into v_customer_email from auth.users where id = p_user_id;
  if v_customer_email is null then raise exception using errcode = 'P0002', message = 'Email pelanggan tidak tersedia.'; end if;
  select * into v_address from public.shipping_addresses where id = p_address_id and user_id = p_user_id;
  if not found or v_address.village_code <> p_destination_village_code then raise exception using errcode = '22023', message = 'Alamat pengiriman tidak valid.'; end if;
  if not exists (
    select 1 from public.payment_settings where id = 1 and (
      (p_payment_method = 'qris' and qris_merchant_name is not null and qris_image_url is not null)
      or (p_payment_method = 'dana' and dana_account_name is not null and dana_number is not null)
      or (p_payment_method = 'bank_transfer' and bank_name is not null and bank_account_holder is not null and bank_account_number is not null)
    )
  ) then raise exception using errcode = 'P0002', message = 'Metode pembayaran belum dikonfigurasi.'; end if;

  select id into v_cart_id from public.carts where user_id = p_user_id for update;
  if not found or not exists (select 1 from public.cart_items where cart_id = v_cart_id) then raise exception using errcode = 'P0002', message = 'Keranjang Anda kosong.'; end if;
  select round(sum(coalesce(products.weight, 0.30) * cart_items.quantity), 3)
    into v_calculated_weight from public.cart_items join public.products on products.id = cart_items.product_id
    where cart_items.cart_id = v_cart_id;
  if v_calculated_weight is null or abs(v_calculated_weight - p_shipping_weight) > 0.001 then raise exception using errcode = '22023', message = 'Berat keranjang berubah. Pilih ulang opsi pengiriman.'; end if;

  insert into public.orders (
    order_number, user_id, customer_email, shipping_address_id, shipping_address_label,
    shipping_full_name, shipping_phone, shipping_address, shipping_city, shipping_province,
    shipping_district, shipping_village, shipping_postal_code, province_code, city_code,
    district_code, destination_village_code, shipping_courier, courier_code, courier_name,
    shipping_estimation, shipping_weight, shipping_status, subtotal, shipping_cost, total, payment_method
  ) values (
    'CTH-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' || lpad(nextval('public.order_number_sequence')::text, 6, '0'),
    p_user_id, v_customer_email, v_address.id, v_address.label, v_address.recipient_name,
    v_address.phone, v_address.full_address, v_address.city_name, v_address.province_name,
    v_address.district_name, v_address.village_name, v_address.postal_code,
    v_address.province_code, v_address.city_code, v_address.district_code,
    v_address.village_code, btrim(p_courier_code), btrim(p_courier_code), btrim(p_courier_name),
    nullif(btrim(p_shipping_estimation), ''), p_shipping_weight, 'pending', 0, p_shipping_cost,
    p_shipping_cost, p_payment_method
  ) returning * into v_order;

  for v_cart_item in
    select cart_items.product_id, cart_items.quantity, cart_items.selected_size,
      cart_items.selected_color, products.name, products.slug, products.price,
      products.stock, products.status,
      (select image_url from public.product_images where product_id = products.id
       order by is_thumbnail desc, created_at asc limit 1) as image_url
    from public.cart_items join public.products on products.id = cart_items.product_id
    where cart_items.cart_id = v_cart_id order by cart_items.created_at for update of products
  loop
    if v_cart_item.status <> 'active' then raise exception using errcode = 'P0002', message = 'Produk di keranjang sudah tidak tersedia.'; end if;
    if v_cart_item.quantity > v_cart_item.stock then raise exception using errcode = '22023', message = 'Jumlah produk di keranjang melebihi stok.'; end if;
    v_item_subtotal := v_cart_item.price * v_cart_item.quantity;
    v_subtotal := v_subtotal + v_item_subtotal;
    insert into public.order_items (order_id, product_id, product_name, product_slug,
      product_image_url, selected_size, selected_color, quantity, unit_price, subtotal)
    values (v_order.id, v_cart_item.product_id, v_cart_item.name, v_cart_item.slug,
      v_cart_item.image_url, v_cart_item.selected_size, v_cart_item.selected_color,
      v_cart_item.quantity, v_cart_item.price, v_item_subtotal);
  end loop;

  if nullif(btrim(p_voucher_code), '') is not null then
    select * into v_voucher from public.vouchers
      where lower(code) = lower(btrim(p_voucher_code)) for update;
    if not found or not v_voucher.is_active then raise exception using errcode = '22023', message = 'Voucher tidak aktif.'; end if;
    if v_voucher.starts_at is not null and v_voucher.starts_at > now() then raise exception using errcode = '22023', message = 'Voucher belum berlaku.'; end if;
    if v_voucher.expires_at is not null and v_voucher.expires_at <= now() then raise exception using errcode = '22023', message = 'Voucher sudah kedaluwarsa.'; end if;
    if v_voucher.usage_limit is not null and v_voucher.used_count >= v_voucher.usage_limit then raise exception using errcode = '22023', message = 'Batas penggunaan voucher telah tercapai.'; end if;
    if v_subtotal < v_voucher.minimum_purchase then raise exception using errcode = '22023', message = 'Minimum pembelian voucher belum tercapai.'; end if;
    if v_voucher.type = 'percentage' then v_discount := round(v_subtotal * v_voucher.value / 100, 2); else v_discount := v_voucher.value; end if;
    if v_voucher.maximum_discount is not null then v_discount := least(v_discount, v_voucher.maximum_discount); end if;
    v_discount := least(v_discount, v_subtotal);
    update public.vouchers set used_count = used_count + 1 where id = v_voucher.id;
    insert into public.voucher_usages(voucher_id, order_id, user_id) values(v_voucher.id, v_order.id, p_user_id);
  end if;

  update public.orders set subtotal = v_subtotal, discount_amount = v_discount,
    voucher_id = v_voucher.id, voucher_code = v_voucher.code,
    total = greatest(v_subtotal + p_shipping_cost - v_discount, 0)
    where id = v_order.id returning * into v_order;
  delete from public.cart_items where cart_id = v_cart_id;
  return v_order;
end;
$$;
revoke all on function public.place_order_with_shipping(uuid,text,uuid,text,text,numeric,text,numeric,text,text) from public, anon, authenticated;
grant execute on function public.place_order_with_shipping(uuid,text,uuid,text,text,numeric,text,numeric,text,text) to service_role;

-- ADMIN PAYMENT ACTIONS + PAID-ONLY STOCK -----------------------------------
create or replace function public.decrement_stock_when_payment_becomes_paid()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_item record;
begin
  if old.payment_status <> 'paid' and new.payment_status = 'paid' then
    for v_item in
      select order_items.product_id, order_items.quantity, products.stock
      from public.order_items
      join public.products on products.id = order_items.product_id
      where order_items.order_id = new.id and order_items.product_id is not null
      for update of products
    loop
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
drop trigger if exists trg_orders_decrement_stock_when_paid on public.orders;
create trigger trg_orders_decrement_stock_when_paid
  before update of payment_status on public.orders
  for each row execute function public.decrement_stock_when_payment_becomes_paid();
revoke execute on function public.decrement_stock_when_payment_becomes_paid()
  from public, anon, authenticated;

drop function if exists public.admin_update_order(uuid, text);
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
    if v_order.payment_status = 'paid' then
      for v_item in select product_id, quantity from public.order_items where order_id = p_order_id and product_id is not null
      loop update public.products set stock = stock + v_item.quantity,
        status = case when status = 'out_of_stock' then 'active' else status end where id = v_item.product_id; end loop;
    end if;
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
revoke all on function public.admin_update_order(uuid,text,text) from public, anon;
grant execute on function public.admin_update_order(uuid,text,text) to authenticated;

-- Payment may only enter verification after a proof exists.
create or replace function public.mark_order_paid(p_order_number text)
returns public.orders language plpgsql security definer set search_path = ''
as $$
declare v_order public.orders;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required.'; end if;
  update public.orders set payment_status = 'waiting_verification', order_status = 'waiting_verification'
    where order_number = btrim(p_order_number) and user_id = auth.uid()
      and payment_status in ('pending','rejected') and order_status = 'pending_payment'
      and payment_proof_url is not null returning * into v_order;
  if v_order.id is null then raise exception using errcode = '22023', message = 'Upload bukti pembayaran terlebih dahulu.'; end if;
  return v_order;
end;
$$;
