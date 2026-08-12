-- Catchus homepage editorial Campaign management.
-- Run after supabase/customer_auth.sql and supabase/banner_management.sql.
-- Campaign images reuse the existing banner-images bucket under campaigns/*.
-- Safe to re-run. Existing rows and Storage objects are preserved.

create extension if not exists "pgcrypto";

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  label text,
  title text not null,
  description text,
  -- Kept so Campaigns created before desktop/mobile support remain readable.
  image_url text,
  desktop_image_url text,
  mobile_image_url text,
  button_text text not null default 'EXPLORE',
  button_url text not null default '/shop',
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_title_not_blank check (btrim(title) <> ''),
  constraint campaigns_button_text_not_blank check (btrim(button_text) <> ''),
  constraint campaigns_button_url_not_blank check (btrim(button_url) <> ''),
  constraint campaigns_display_order_nonnegative check (display_order >= 0)
);

-- Upgrade an existing single-image Campaign installation in place.
alter table public.campaigns add column if not exists desktop_image_url text;
alter table public.campaigns add column if not exists mobile_image_url text;

-- Preserve every legacy image as the Desktop Image. The public/mobile layer
-- falls back to Desktop until an independently-cropped Mobile Image is saved.
update public.campaigns
set desktop_image_url = image_url
where desktop_image_url is null
  and image_url is not null;

create index if not exists idx_campaigns_public_order
  on public.campaigns (display_order, created_at)
  where is_active = true;

drop trigger if exists trg_campaigns_set_updated_at on public.campaigns;
create trigger trg_campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

alter table public.campaigns enable row level security;

drop policy if exists "Public read active campaigns" on public.campaigns;
create policy "Public read active campaigns" on public.campaigns
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins read all campaigns" on public.campaigns;
create policy "Admins read all campaigns" on public.campaigns
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins insert campaigns" on public.campaigns;
create policy "Admins insert campaigns" on public.campaigns
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins update campaigns" on public.campaigns;
create policy "Admins update campaigns" on public.campaigns
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins delete campaigns" on public.campaigns;
create policy "Admins delete campaigns" on public.campaigns
  for delete to authenticated
  using ((select public.is_admin()));

-- No new bucket or Storage policy is required. The existing banner-images
-- policies already allow public reads and admin-only writes for this bucket.
