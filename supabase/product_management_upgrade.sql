-- Catchus Product Management upgrade
-- Safe for existing databases: this only adds a nullable column, so existing
-- product rows and all current storefront queries continue to work unchanged.

alter table public.products
  add column if not exists short_description text;

comment on column public.products.short_description is
  'Concise product summary for product detail, quick view, and SEO metadata.';

-- Run after customer_auth.sql. Public access stays limited to active products; admins
-- can also load galleries belonging to draft and inactive products.
drop policy if exists "Authenticated read all product images" on public.product_images;
drop policy if exists "Admins read all product images" on public.product_images;
create policy "Admins read all product images"
  on public.product_images for select
  to authenticated
  using ((select public.is_admin()));
