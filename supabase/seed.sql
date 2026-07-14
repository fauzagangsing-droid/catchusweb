-- ============================================================================
-- OPTIONAL seed data — derived 1:1 from the old lib/products.ts static array.
-- Run this AFTER schema.sql if you want to test the storefront immediately
-- instead of adding products by hand.
-- ============================================================================

insert into public.categories (name, slug) values
  ('Sweater', 'sweater'),
  ('T-shirt', 't-shirt'),
  ('Beanie', 'beanie')
on conflict (slug) do nothing;

-- Hoodie
with cat as (select id from public.categories where slug = 'sweater')
insert into public.products (slug, name, category_id, price, compare_price, status, shopee_url)
select 'hoodie-catchus-inverted-cross-oversize-330gsm',
       'Hoodie Catchus -Inverted cross- Oversize 330GSM',
       cat.id, 247500, 400000, 'active', 'https://s.shopee.co.id/4foSmdo80Z'
from cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, is_thumbnail)
select id, '/images/Sweater.png', true from public.products
where slug = 'hoodie-catchus-inverted-cross-oversize-330gsm'
on conflict do nothing;

-- Beanie
with cat as (select id from public.categories where slug = 'beanie')
insert into public.products (slug, name, category_id, price, compare_price, status, shopee_url)
select 'beanie-hat-catchus-inverted-cross-knit-cotton-rajut',
       'Beanie hat Catchus - Inverted cross-knit cotton rajut',
       cat.id, 66000, 120000, 'active', 'https://s.shopee.co.id/8fKbYII0tm'
from cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, is_thumbnail)
select id, '/images/beanie.png', true from public.products
where slug = 'beanie-hat-catchus-inverted-cross-knit-cotton-rajut'
on conflict do nothing;

-- T-shirts (subset shown; repeat the pattern above for the remaining baju2–baju11)
with cat as (select id from public.categories where slug = 't-shirt')
insert into public.products (slug, name, category_id, price, compare_price, status, shopee_url)
select 'catchus-club-direction-of-war-boxy-oversize-tshirt',
       'Catchus Club - Direction of war- Boxy oversize Tshirt',
       cat.id, 110000, 200000, 'active', 'https://s.shopee.co.id/20nhbmaJTw'
from cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, is_thumbnail)
select id, '/images/baju1.png', true from public.products
where slug = 'catchus-club-direction-of-war-boxy-oversize-tshirt'
on conflict do nothing;
-- prdk 1
with cat as (select id from public.categories where slug = 't-shirt')
insert into public.products (slug, name, category_id, price, compare_price, status, shopee_url)
select 'catchus-club-direction-of-war-boxy-oversize-tshirt',
       'Catchus Club - Direction of war- Boxy oversize Tshirt',
       cat.id, 110000, 200000, 'active', 'https://s.shopee.co.id/20nhbmaJTw'
from cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, is_thumbnail)
select id, '/images/baju2.png', true from public.products
where slug = 'catchus-club-direction-of-war-boxy-oversize-tshirt'
on conflict do nothing;
-- prduk 2
with cat as (select id from public.categories where slug = 't-shirt')
insert into public.products (slug, name, category_id, price, compare_price, status, shopee_url)
select 'Catchus-club-army-series-white-tshirt',
       'Catchus Club - Army series White - Tshirt',
       cat.id, 110000, 200000, 'active', 'https://s.shopee.co.id/12dEt6XDg'
from cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, is_thumbnail)
select id, '/images/baju3.png', true from public.products
where slug = 'Catchus-club-army-series-white-tshirt'
on conflict do nothing;
-- prdk 3
with cat as (select id from public.categories where slug = 't-shirt')
insert into public.products (slug, name, category_id, price, compare_price, status, shopee_url)
select 'Catchus-club-the-great-progress-tshirt',
       'Catchus Club - The Great Progress -Tshirt',
       cat.id, 110000, 200000, 'active', 'https://s.shopee.co.id/7plUYYdm2a'
from cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, is_thumbnail)
select id, '/images/baju4.png', true from public.products
where slug = 'Catchus-club-the-great-progress-tshirt'
on conflict do nothing;
-- prdk 4
with cat as (select id from public.categories where slug = 't-shirt')
insert into public.products (slug, name, category_id, price, compare_price, status, shopee_url)
select 'Catchus-club-the-flower-tshirt',
       'Catchus Club - The Flower T-shirt',
       cat.id, 110000, 200000, 'active', 'https://s.shopee.co.id/2LQY0TxQH5'
from cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, is_thumbnail)
select id, '/images/baju5.png', true from public.products
where slug = 'Catchus-club-the-flower-tshirt'
on conflict do nothing;
-- prdk 5
with cat as (select id from public.categories where slug = 't-shirt')
insert into public.products (slug, name, category_id, price, compare_price, status, shopee_url)
select 'catchus-club-biggest-boxy-tshirt',
       'Catchus Club - Bigest Boxy - Tshirt',
       cat.id, 110000, 200000, 'active', 'https://s.shopee.co.id/5fgzyd2PQm'
from cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, is_thumbnail)
select id, '/images/baju6.png', true from public.products
where slug = 'catchus-club-biggest-boxy-tshirt'
on conflict do nothing;
-- prdk 6
with cat as (select id from public.categories where slug = 't-shirt')
insert into public.products (slug, name, category_id, price, compare_price, status, shopee_url)
select 'catchus-club-never-seen-by-anyone-tshirt',
       'Catchus Club - Never Seen By Anyone- Tshirt',
       cat.id, 110000, 200000, 'active', 'https://s.shopee.co.id/6KwglsTqx7'
from cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, is_thumbnail)
select id, '/images/baju7.png', true from public.products
where slug = 'catchus-club-never-seen-by-anyone-tshirt'
on conflict do nothing;
-- prdk 7
with cat as (select id from public.categories where slug = 't-shirt')
insert into public.products (slug, name, category_id, price, compare_price, status, shopee_url)
select 'catchus-club-human-of-their-time-tshirt',
       'Catchus Club - Human Of Their Time - Tshirt',
       cat.id, 110000, 200000, 'active', 'https://s.shopee.co.id/6Kwgmqj92S'
from cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, is_thumbnail)
select id, '/images/baju8.png', true from public.products
where slug = 'catchus-club-human-of-their-time-tshirt'
on conflict do nothing;
-- prdk 8
with cat as (select id from public.categories where slug = 't-shirt')
insert into public.products (slug, name, category_id, price, compare_price, status, shopee_url)
select 'catchus-club-stop-killing-black-people-tshirt',
       'Catchus Club - Stop Killing Black People - Tshirt',
       cat.id, 110000, 200000, 'active', 'https://s.shopee.co.id/BM3Ri1uXB'
from cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, is_thumbnail)
select id, '/images/baju9.png', true from public.products
where slug = 'catchus-club-stop-killing-black-people-tshirt'
on conflict do nothing;
-- prdk 9
with cat as (select id from public.categories where slug = 't-shirt')
insert into public.products (slug, name, category_id, price, compare_price, status, shopee_url)
select 'catchus-club-army-series-black-tshirt',
       'Catchus Club - Army series Black Tshirt',
       cat.id, 110000, 200000, 'active', 'https://s.shopee.co.id/60JqNLtyvM'
from cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, is_thumbnail)
select id, '/images/baju10.png', true from public.products
where slug = 'catchus-club-army-series-black-tshirt'
on conflict do nothing;
-- prdk 10
with cat as (select id from public.categories where slug = 't-shirt')
insert into public.products (slug, name, category_id, price, compare_price, status, shopee_url)
select 'catchus-club-c.u.c-ak-47-tshirt',
       'Catchus Club - C.U.C AK-47 - Tshirt',
       cat.id, 110000, 200000, 'active', 'https://s.shopee.co.id/7V8eA89jDs'
from cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, is_thumbnail)
select id, '/images/baju11.png', true from public.products
where slug = 'catchus-club-c.u.c-ak-47-tshirt'
on conflict do nothing;
-- prdk 11
with cat as (select id from public.categories where slug = 't-shirt')
insert into public.products (slug, name, category_id, price, compare_price, status, shopee_url)
select 'catchus-club-~c.u.c-chrome~-boxy-tshirt',
       'Catchus Club ~C.U.C CHROME~ Boxy Tshirt',
       cat.id, 135000, 200000, 'active', 'https://shopee.co.id/Catchus-Club-~C.U.C-CHROME~-Boxy-Tshirt-i.742978637.56912974905?extraParams=%7B%22display_model_id%22%3A386125757796%2C%22model_selection_logic%22%3A3%7D'
from cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, image_url, is_thumbnail)
select id, '/images/baju12.png', true from public.products
where slug = 'catchus-club-~c.u.c-chrome~-boxy-tshirt'
on conflict do nothing;

-- Add the remaining products (baju2.png .. baju11.png) following the same
-- three-step pattern (category lookup → product insert → image insert)
-- with the original title/price/shopee_url values from lib/products.ts.
