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
-- TABLE: website_settings (singleton row, id = 1)
-- ============================================================================
create table if not exists public.website_settings (
  id                  smallint primary key default 1,
  brand_name          text not null default 'Catchus',
  website_title       text not null default 'Catchus Official',
  website_description text not null default 'Catchus menghadirkan koleksi apparel dengan desain khas dan kualitas terbaik.',
  logo_url            text,
  favicon_url         text default '/icons/nm.png',
  hero_title          text not null default 'Catchus Katalog',
  hero_subtitle       text not null default 'Catchus menghadirkan koleksi apparel dengan desain khas dan kualitas terbaik.',
  hero_button_text    text not null default 'Detail Produk',
  hero_button_url     text not null default '#produk',
  whatsapp            text,
  email               text,
  instagram_url       text,
  tiktok_url          text,
  facebook_url        text,
  shopee_url          text,
  tokopedia_url       text,
  tiktok_shop_url     text,
  copyright_text      text not null default '© Copyrights 2024 by Catchus Official',
  updated_at          timestamptz not null default now(),
  constraint website_settings_singleton check (id = 1)
);

comment on table public.website_settings is 'Singleton global storefront settings record. Only id = 1 is allowed.';

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
  weight         numeric(5, 2) not null default 0.30,
  status         text not null default 'active',
  featured       boolean not null default false,
  shopee_url     text,
  tiktok_url     text,
  tiktok_shop_url text,
  tokopedia_url  text,
  lazada_url     text,
  blibli_url     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint products_slug_key unique (slug),
  constraint products_sku_key unique (sku),
  constraint products_name_not_blank check (btrim(name) <> ''),
  constraint products_price_nonnegative check (price >= 0),
  constraint products_compare_price_nonnegative check (compare_price is null or compare_price >= 0),
  constraint products_stock_nonnegative check (stock >= 0),
  constraint products_weight_nonnegative check (weight >= 0),
  constraint products_status_valid check (status in ('active', 'inactive', 'draft', 'out_of_stock'))
);

comment on table public.products is 'Catalog products. category_id is nullable + ON DELETE SET NULL so removing a category never deletes products.';
comment on column public.products.short_description is 'Concise product summary for product cards, quick views, and SEO metadata.';
comment on column public.products.weight is 'Shipping weight per product in kilograms.';

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

drop trigger if exists trg_website_settings_set_updated_at on public.website_settings;
create trigger trg_website_settings_set_updated_at
  before update on public.website_settings
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
alter table public.website_settings enable row level security;

drop policy if exists "Public read website settings" on public.website_settings;
create policy "Public read website settings"
  on public.website_settings for select
  to anon, authenticated
  using (id = 1);

drop policy if exists "Authenticated insert website settings" on public.website_settings;
drop policy if exists "Authenticated update website settings" on public.website_settings;

-- Website settings remain read-only until customer_auth.sql installs the
-- private admin allow-list and its public.is_admin() write policies.

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
