-- ============================================================================
-- Catchus - per-product shipping weight in kilograms
-- Run after supabase/schema.sql and before accepting new checkouts.
-- ============================================================================

alter table public.products
  add column if not exists weight numeric(5, 2);

-- Initial catalog defaults. Matching is intentionally based on the product
-- name and category so size variants never influence shipment weight.
with product_classification as (
  select
    products.id,
    lower(concat_ws(' ', products.name, categories.name, categories.slug)) as descriptor
  from public.products as products
  left join public.categories as categories on categories.id = products.category_id
)
update public.products as products
set weight = case
  when classification.descriptor like '%zip hoodie%' then 1.00
  when classification.descriptor like '%hoodie%' then 0.90
  when classification.descriptor like '%jacket%' then 1.10
  when classification.descriptor like '%crewneck%' then 0.70
  when classification.descriptor like '%long sleeve%' then 0.35
  when classification.descriptor like '%tote bag%' then 0.20
  when classification.descriptor like '%sticker%' then 0.05
  when classification.descriptor like '%oversize tee%'
    or classification.descriptor like '%oversized tee%'
    or classification.descriptor like '%t-shirt%'
    or classification.descriptor like '%tshirt%'
    then 0.30
  else coalesce(products.weight, 0.30)
end
from product_classification as classification
where classification.id = products.id;

update public.products set weight = 0.30 where weight is null;

alter table public.products
  alter column weight type numeric(5, 2) using weight::numeric(5, 2),
  alter column weight set default 0.30,
  alter column weight set not null;

alter table public.products
  drop constraint if exists products_weight_positive;
alter table public.products
  drop constraint if exists products_weight_nonnegative;
alter table public.products
  add constraint products_weight_nonnegative check (weight >= 0);

comment on column public.products.weight is
  'Shipping weight per product in kilograms; shared by every size variant.';
