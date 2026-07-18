-- ============================================================================
-- Catchus - Product marketplace links
-- Adds nullable marketplace destinations without recreating public.products.
-- Safe to run more than once.
-- ============================================================================

alter table public.products
  add column if not exists shopee_url text,
  add column if not exists tokopedia_url text,
  add column if not exists tiktok_shop_url text,
  add column if not exists lazada_url text,
  add column if not exists blibli_url text;

-- Preserve links saved by earlier versions that used tiktok_url for TikTok Shop.
update public.products
set tiktok_shop_url = tiktok_url
where tiktok_shop_url is null
  and tiktok_url is not null;

