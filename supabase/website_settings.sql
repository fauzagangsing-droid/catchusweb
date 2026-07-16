-- Catchus Website Settings Management
-- Safe to run on an existing project. Creates one global settings record.

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

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_website_settings_set_updated_at on public.website_settings;
create trigger trg_website_settings_set_updated_at
  before update on public.website_settings
  for each row execute function public.set_updated_at();

insert into public.website_settings (
  id, brand_name, website_title, website_description, favicon_url,
  hero_title, hero_subtitle, hero_button_text, hero_button_url,
  whatsapp, instagram_url, shopee_url, copyright_text
) values (
  1,
  'Catchus',
  'Catchus Official',
  'Catchus menghadirkan koleksi apparel dengan desain khas dan kualitas terbaik.',
  '/icons/nm.png',
  'Catchus Katalog',
  'Catchus menghadirkan koleksi apparel dengan desain khas dan kualitas terbaik. Setiap produk diproduksi dengan bahan pilihan serta perhatian tinggi pada detail, sehingga memberikan kenyamanan dan daya tahan lebih lama. Kami percaya bahwa fashion bukan hanya tentang pakaian, tetapi tentang bagaimana kamu mengekspresikan diri. Temukan koleksi Catchus yang sesuai dengan gaya.',
  'Detail Produk',
  '#produk',
  'https://wa.me/6283865961290',
  'https://www.instagram.com/catchus.club/',
  'https://shopee.co.id/catchus.official',
  '© Copyrights 2024 by Catchus Official'
)
on conflict (id) do nothing;

alter table public.website_settings enable row level security;

drop policy if exists "Public read website settings" on public.website_settings;
create policy "Public read website settings"
  on public.website_settings for select to anon, authenticated
  using (id = 1);

drop policy if exists "Authenticated insert website settings" on public.website_settings;
create policy "Authenticated insert website settings"
  on public.website_settings for insert to authenticated
  with check (id = 1);

drop policy if exists "Authenticated update website settings" on public.website_settings;
create policy "Authenticated update website settings"
  on public.website_settings for update to authenticated
  using (id = 1) with check (id = 1);
