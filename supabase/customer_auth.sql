-- Catchus Customer Authentication
-- Run once in Supabase SQL Editor after the existing schema/admin policies.
-- Safe to re-run. Existing Auth users are preserved as admins exactly once;
-- customer accounts registered after this migration never receive admin rights.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Admin/customer authorization boundary
-- The previous dashboard policies trusted every `authenticated` user. Now that
-- customers can register, existing Auth users are captured as admins once and
-- all future admin writes are checked against this private allow-list.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_migration_state (
  id text primary key,
  applied_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from public.auth_migration_state
    where id = 'bootstrap-existing-admin-users-v1'
  ) then
    insert into public.admin_users (id)
    select id from auth.users
    on conflict (id) do nothing;

    insert into public.auth_migration_state (id)
    values ('bootstrap-existing-admin-users-v1');
  end if;
end;
$$;

alter table public.admin_users enable row level security;
alter table public.auth_migration_state enable row level security;
revoke all on public.admin_users from anon, authenticated;
revoke all on public.auth_migration_state from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Replace the old broad authenticated policies with admin-only equivalents.
drop policy if exists "Authenticated read all products" on public.products;
drop policy if exists "Authenticated insert products" on public.products;
drop policy if exists "Authenticated update products" on public.products;
drop policy if exists "Authenticated delete products" on public.products;

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

create policy "Admins insert categories" on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update categories" on public.categories
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete categories" on public.categories
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists "Authenticated insert website settings" on public.website_settings;
drop policy if exists "Authenticated update website settings" on public.website_settings;

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

-- ---------------------------------------------------------------------------
-- Customer profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (
    full_name is null or char_length(btrim(full_name)) between 2 and 100
  )
);

create index if not exists idx_profiles_updated_at on public.profiles (updated_at);

create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Existing admin accounts are intentionally not duplicated as customers.
  if not exists (select 1 from public.admin_users where id = new.id) then
    insert into public.profiles (id, full_name)
    values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''))
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_customer_auth_user_created on auth.users;
create trigger on_customer_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_customer();

create or replace function public.set_profile_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profile_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- Customer avatar storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars" on storage.objects
  for select to public using (bucket_id = 'avatars');

drop policy if exists "Users upload own avatars" on storage.objects;
create policy "Users upload own avatars" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users update own avatars" on storage.objects;
create policy "Users update own avatars" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users delete own avatars" on storage.objects;
create policy "Users delete own avatars" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid()::text)
  );
