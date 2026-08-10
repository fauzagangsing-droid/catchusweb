-- Catchus homepage Banner/Campaign management
-- Run after supabase/customer_auth.sql so public.is_admin() is available.
-- Safe to re-run. Existing banner rows and Auth users are preserved.

create extension if not exists "pgcrypto";

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  button_text text,
  button_url text,
  desktop_image_url text,
  mobile_image_url text,
  desktop_video_url text,
  mobile_video_url text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint banners_title_not_blank check (btrim(title) <> ''),
  constraint banners_display_order_nonnegative check (display_order >= 0)
);

-- Complete older/prepared banner tables without replacing them.
alter table public.banners add column if not exists subtitle text;
alter table public.banners add column if not exists button_text text;
alter table public.banners add column if not exists button_url text;
alter table public.banners add column if not exists desktop_image_url text;
alter table public.banners add column if not exists mobile_image_url text;
alter table public.banners add column if not exists desktop_video_url text;
alter table public.banners add column if not exists mobile_video_url text;
alter table public.banners add column if not exists is_active boolean not null default true;
alter table public.banners add column if not exists display_order integer not null default 0;
alter table public.banners add column if not exists created_at timestamptz not null default now();
alter table public.banners add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_banners_public_order
  on public.banners (display_order, created_at)
  where is_active = true;

drop trigger if exists trg_banners_set_updated_at on public.banners;
create trigger trg_banners_set_updated_at
  before update on public.banners
  for each row execute function public.set_updated_at();

alter table public.banners enable row level security;

drop policy if exists "Public read active banners" on public.banners;
create policy "Public read active banners" on public.banners
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins read all banners" on public.banners;
create policy "Admins read all banners" on public.banners
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins insert banners" on public.banners;
create policy "Admins insert banners" on public.banners
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins update banners" on public.banners;
create policy "Admins update banners" on public.banners
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins delete banners" on public.banners;
create policy "Admins delete banners" on public.banners
  for delete to authenticated
  using ((select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'banner-images',
  'banner-images',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read banner images" on storage.objects;
create policy "Public read banner images" on storage.objects
  for select to public
  using (bucket_id = 'banner-images');

drop policy if exists "Admins upload banner images" on storage.objects;
create policy "Admins upload banner images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'banner-images' and (select public.is_admin()));

drop policy if exists "Admins update banner images" on storage.objects;
create policy "Admins update banner images" on storage.objects
  for update to authenticated
  using (bucket_id = 'banner-images' and (select public.is_admin()))
  with check (bucket_id = 'banner-images' and (select public.is_admin()));

drop policy if exists "Admins delete banner images" on storage.objects;
create policy "Admins delete banner images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'banner-images' and (select public.is_admin()));
