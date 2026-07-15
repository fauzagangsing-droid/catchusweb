-- Catchus - Category Management safeguards
-- Run after schema.sql and admin_rls_policies.sql. Safe to re-run.

-- The original unique slug constraint is case-sensitive. These indexes make
-- names and slugs unique regardless of capitalization or surrounding spaces.
create unique index if not exists categories_name_lower_key
  on public.categories ((lower(btrim(name))));

create unique index if not exists categories_slug_lower_key
  on public.categories ((lower(btrim(slug))));

-- products.category_id was intentionally defined with ON DELETE SET NULL for
-- the initial catalog schema. This trigger preserves that schema while making
-- Category Management refuse deletion of a category still assigned to products.
create or replace function public.prevent_used_category_deletion()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.products where category_id = old.id) then
    raise exception 'Cannot delete a category that is still assigned to products.'
      using errcode = '23503';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_used_category_deletion on public.categories;
create trigger trg_prevent_used_category_deletion
  before delete on public.categories
  for each row
  execute function public.prevent_used_category_deletion();
