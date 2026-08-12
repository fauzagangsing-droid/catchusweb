-- ============================================================================
-- Catchus — Product Image Upload: Storage bucket + RLS
-- Run after customer_auth.sql. Safe to re-run.
--
-- Why this file exists:
-- supabase/schema.sql already created the product_images TABLE (with a
-- unique index enforcing one thumbnail per product), but shipped with only
-- a public SELECT policy — no way for an admin to write a row. And no
-- Storage bucket has been created yet to actually hold the image files.
-- This file adds exactly those two things, following the same pattern as
-- supabase/admin_rls_policies.sql: browser sessions must also pass
-- public.is_admin(); authentication alone never authorizes uploads.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. STORAGE BUCKET
-- Public bucket: product photos need to be readable by anyone (storefront +
-- admin), and the app talks to Storage straight from the browser with the
-- anon key — there is no server-side proxy to sign private URLs through.
-- file_size_limit is in bytes (5 MB); allowed_mime_types is defense-in-depth
-- alongside the client-side validation in lib/storage.ts.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 2. STORAGE OBJECT POLICIES (storage.objects)
-- ----------------------------------------------------------------------------

-- Anyone can read files in this bucket (it's a public product catalog).
drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

-- Allow-listed admins can upload new files into this bucket.
drop policy if exists "Authenticated upload product images" on storage.objects;
create policy "Authenticated upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

-- Signed-in admins can overwrite files in this bucket (x-upsert: true).
drop policy if exists "Authenticated update product images" on storage.objects;
create policy "Authenticated update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

-- Signed-in admins can delete files (replace old image / delete product).
drop policy if exists "Authenticated delete product images" on storage.objects;
create policy "Authenticated delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- ----------------------------------------------------------------------------
-- 3. product_images TABLE — write policies
-- schema.sql only granted SELECT. Row-level security is already enabled on
-- this table (alter table ... enable row level security in schema.sql).
-- ----------------------------------------------------------------------------

drop policy if exists "Authenticated insert product images" on public.product_images;
drop policy if exists "Authenticated read all product images" on public.product_images;
create policy "Authenticated read all product images"
  on public.product_images for select
  to authenticated
  using ((select public.is_admin()));

create policy "Authenticated insert product images"
  on public.product_images for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Authenticated update product images" on public.product_images;
create policy "Authenticated update product images"
  on public.product_images for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Authenticated delete product images" on public.product_images;
create policy "Authenticated delete product images"
  on public.product_images for delete
  to authenticated
  using ((select public.is_admin()));
