-- ============================================================================
-- Catchus — Admin Product Management RLS policies
-- Run after customer_auth.sql. Safe to re-run.
--
-- Why this file exists:
-- schema.sql only ever granted `select` to anon/authenticated, and only for
-- products where status = 'active' (a public, read-only storefront). It
-- intentionally shipped with NO insert/update/delete policies at all,
-- deferring write access "until an admin phase adds it".
--
-- This is that admin phase. The admin app signs admins in via Supabase Auth
-- (see components/admin/AdminLoginForm.tsx) and talks to Supabase directly
-- from the browser using the anon key (see lib/supabase-browser.ts) — there
-- is no server-side service-role key in this project. So the *only* way an
-- authenticated admin session can manage products is via RLS policies that
-- require public.is_admin(). Authentication alone never authorizes writes.
-- else: it does not alter any table, column, or the existing public/anon
-- read policies in schema.sql.
--
-- Note: Postgres combines multiple permissive policies for the same command
-- with OR, so adding "authenticated can select all products" alongside the
-- existing "public read active products" policy simply widens what an
-- authenticated admin can see; it does not narrow or replace anything.
-- ============================================================================

-- Allow-listed admins can see every product regardless of status
-- (draft / inactive / out_of_stock included), not just active ones.
drop policy if exists "Authenticated read all products" on public.products;
create policy "Authenticated read all products"
  on public.products for select
  to authenticated
  using ((select public.is_admin()));

-- Authenticated admins can create products.
drop policy if exists "Authenticated insert products" on public.products;
create policy "Authenticated insert products"
  on public.products for insert
  to authenticated
  with check ((select public.is_admin()));

-- Authenticated admins can edit products (details, featured, status/active, etc).
drop policy if exists "Authenticated update products" on public.products;
create policy "Authenticated update products"
  on public.products for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Authenticated admins can delete products.
drop policy if exists "Authenticated delete products" on public.products;
create policy "Authenticated delete products"
  on public.products for delete
  to authenticated
  using ((select public.is_admin()));

-- Authenticated admins can manage categories. Public read access remains
-- unchanged in schema.sql; these policies add only the admin write actions.
drop policy if exists "Authenticated insert categories" on public.categories;
create policy "Authenticated insert categories"
  on public.categories for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Authenticated update categories" on public.categories;
create policy "Authenticated update categories"
  on public.categories for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Authenticated delete categories" on public.categories;
create policy "Authenticated delete categories"
  on public.categories for delete
  to authenticated
  using ((select public.is_admin()));
