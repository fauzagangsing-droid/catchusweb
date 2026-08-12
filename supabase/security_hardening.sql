-- Catchus security hardening
-- Run after all existing Catchus SQL files, including customer_auth.sql and
-- commerce_extensions.sql. Safe to re-run.

begin;

-- Reassert the customer/admin boundary even if an older setup script was
-- accidentally re-run after customer_auth.sql.
drop policy if exists "Authenticated read all products" on public.products;
drop policy if exists "Authenticated insert products" on public.products;
drop policy if exists "Authenticated update products" on public.products;
drop policy if exists "Authenticated delete products" on public.products;
drop policy if exists "Admins read all products" on public.products;
drop policy if exists "Admins insert products" on public.products;
drop policy if exists "Admins update products" on public.products;
drop policy if exists "Admins delete products" on public.products;
create policy "Admins read all products" on public.products
  for select to authenticated using ((select public.is_admin()));
create policy "Admins insert products" on public.products
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update products" on public.products
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete products" on public.products
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "Authenticated insert categories" on public.categories;
drop policy if exists "Authenticated update categories" on public.categories;
drop policy if exists "Authenticated delete categories" on public.categories;
drop policy if exists "Admins insert categories" on public.categories;
drop policy if exists "Admins update categories" on public.categories;
drop policy if exists "Admins delete categories" on public.categories;
create policy "Admins insert categories" on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update categories" on public.categories
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete categories" on public.categories
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "Authenticated insert website settings" on public.website_settings;
drop policy if exists "Authenticated update website settings" on public.website_settings;
drop policy if exists "Admins insert website settings" on public.website_settings;
drop policy if exists "Admins update website settings" on public.website_settings;
create policy "Admins insert website settings" on public.website_settings
  for insert to authenticated
  with check (id = 1 and (select public.is_admin()));
create policy "Admins update website settings" on public.website_settings
  for update to authenticated
  using (id = 1 and (select public.is_admin()))
  with check (id = 1 and (select public.is_admin()));

drop policy if exists "Authenticated read all product images" on public.product_images;
drop policy if exists "Authenticated insert product images" on public.product_images;
drop policy if exists "Authenticated update product images" on public.product_images;
drop policy if exists "Authenticated delete product images" on public.product_images;
drop policy if exists "Admins read all product images" on public.product_images;
drop policy if exists "Admins insert product images" on public.product_images;
drop policy if exists "Admins update product images" on public.product_images;
drop policy if exists "Admins delete product images" on public.product_images;
create policy "Admins read all product images" on public.product_images
  for select to authenticated using ((select public.is_admin()));
create policy "Admins insert product images" on public.product_images
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update product images" on public.product_images
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete product images" on public.product_images
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "Authenticated upload product images" on storage.objects;
drop policy if exists "Authenticated update product images" on storage.objects;
drop policy if exists "Authenticated delete product images" on storage.objects;
drop policy if exists "Admins upload product image files" on storage.objects;
drop policy if exists "Admins update product image files" on storage.objects;
drop policy if exists "Admins delete product image files" on storage.objects;
create policy "Admins upload product image files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy "Admins update product image files" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy "Admins delete product image files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- Voucher definitions include redeemable codes. Customers validate one code
-- through the server API; only admins may enumerate the table directly.
drop policy if exists "Customers read active vouchers" on public.vouchers;
drop policy if exists "Admins manage vouchers" on public.vouchers;
create policy "Admins manage vouchers" on public.vouchers
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- The public review API exposes only display fields. Direct table reads used
-- to reveal auth user UUIDs and order UUIDs for every review.
revoke all on public.product_reviews from anon, authenticated;
drop policy if exists "Public read product reviews" on public.product_reviews;
drop policy if exists "Verified buyers create reviews" on public.product_reviews;
drop policy if exists "Customers update own reviews" on public.product_reviews;
drop policy if exists "Customers delete own reviews" on public.product_reviews;

-- This legacy helper is no longer used by the API. Keep customers from
-- assigning arbitrary Discord message identifiers to their orders.
do $block$
begin
  if to_regprocedure('public.set_order_discord_message_id(uuid,text)') is not null then
    execute 'revoke all on function public.set_order_discord_message_id(uuid,text) from public, anon, authenticated';
  end if;
end;
$block$;

commit;
