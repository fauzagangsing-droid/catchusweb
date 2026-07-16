-- ============================================================================
-- Catchus — Phase 2 database schema
-- Paste directly into Supabase SQL Editor and run.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================================
-- TABLE: categories
-- ============================================================================
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null,
  icon       text,
  banner     text,
  created_at timestamptz not null default now(),

  constraint categories_slug_key unique (slug),
  constraint categories_name_not_blank check (btrim(name) <> ''),
  constraint categories_slug_not_blank check (btrim(slug) <> '')
);

comment on table public.categories is 'Top-level product categories (sweater, t-shirt, beanie, ...).';

-- ============================================================================
-- TABLE: products
-- ============================================================================
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null,
  name           text not null,
  short_description text,
  description    text,
  brand          text,
  sku            text,
  category_id    uuid references public.categories (id) on delete set null,
  price          numeric(12, 2) not null,
  compare_price  numeric(12, 2),
  stock          integer not null default 0,
  weight         numeric(10, 2),
  status         text not null default 'active',
  featured       boolean not null default false,
  shopee_url     text,
  tiktok_url     text,
  tokopedia_url  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint products_slug_key unique (slug),
  constraint products_sku_key unique (sku),
  constraint products_name_not_blank check (btrim(name) <> ''),
  constraint products_price_nonnegative check (price >= 0),
  constraint products_compare_price_nonnegative check (compare_price is null or compare_price >= 0),
  constraint products_stock_nonnegative check (stock >= 0),
  constraint products_weight_nonnegative check (weight is null or weight >= 0),
  constraint products_status_valid check (status in ('active', 'inactive', 'draft', 'out_of_stock'))
);

comment on table public.products is 'Catalog products. category_id is nullable + ON DELETE SET NULL so removing a category never deletes products.';
comment on column public.products.short_description is 'Concise product summary for product cards, quick views, and SEO metadata.';

-- Keep updated_at accurate automatically
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_set_updated_at on public.products;
create trigger trg_products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

-- ============================================================================
-- TABLE: product_images
-- ============================================================================
create table if not exists public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  image_url    text not null,
  is_thumbnail boolean not null default false,
  created_at   timestamptz not null default now(),

  constraint product_images_url_not_blank check (btrim(image_url) <> '')
);

comment on table public.product_images is 'Product photos. ON DELETE CASCADE: images are meaningless without their parent product.';

-- ============================================================================
-- INDEXES
-- ============================================================================
create index if not exists idx_products_category_id on public.products (category_id);
create index if not exists idx_products_status on public.products (status);
create index if not exists idx_products_featured on public.products (featured) where featured = true;
create index if not exists idx_product_images_product_id on public.product_images (product_id);

-- Enforce "at most one thumbnail per product" at the database level
create unique index if not exists uq_one_thumbnail_per_product
  on public.product_images (product_id)
  where is_thumbnail = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- Phase 2 has no auth/admin yet, so the only requirement is: the public
-- anon key may READ the catalog, and may not write anything.
-- ============================================================================
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories"
  on public.categories for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read active products" on public.products;
create policy "Public read active products"
  on public.products for select
  to anon, authenticated
  using (status = 'active');

drop policy if exists "Public read product images" on public.product_images;
create policy "Public read product images"
  on public.product_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.status = 'active'
    )
  );

-- No insert/update/delete policies are defined for anon/authenticated —
-- write access is intentionally left out until an admin phase adds it
-- (via service_role key on the server, which bypasses RLS entirely).
