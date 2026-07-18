-- ============================================================================
-- Catchus - Phase 6 Shopping Cart
-- Run this migration in the Supabase SQL Editor.
-- Safe to re-run: tables, policies, triggers, and functions are idempotent.
-- ============================================================================

create extension if not exists "pgcrypto";

-- One persistent cart belongs to one authenticated customer.
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carts_user_id_key unique (user_id)
);

-- Size and color are nullable until product variants are introduced. Keeping
-- them on the persisted item makes the cart ready for that future phase.
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null default 1,
  selected_size text,
  selected_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_items_cart_product_key unique (cart_id, product_id),
  constraint cart_items_quantity_positive check (quantity >= 1),
  constraint cart_items_selected_size_not_blank check (
    selected_size is null or btrim(selected_size) <> ''
  ),
  constraint cart_items_selected_color_not_blank check (
    selected_color is null or btrim(selected_color) <> ''
  )
);

create index if not exists idx_carts_user_id on public.carts (user_id);
create index if not exists idx_cart_items_cart_id on public.cart_items (cart_id);
create index if not exists idx_cart_items_product_id on public.cart_items (product_id);

-- Product row locks require UPDATE access in PostgreSQL. Customers must not
-- receive product UPDATE access, so this narrow security-definer function
-- performs only the active-product stock lookup and lock needed by the cart.
create or replace function public.get_active_product_stock_for_cart(
  p_product_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock integer;
begin
  select products.stock
  into v_stock
  from public.products
  where products.id = p_product_id
    and products.status = 'active'
  for share;

  if not found then
    raise exception using errcode = 'P0002', message = 'Product is not available.';
  end if;

  return v_stock;
end;
$$;

create or replace function public.validate_cart_item_quantity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_stock integer;
begin
  v_stock := public.get_active_product_stock_for_cart(new.product_id);

  if new.quantity > v_stock then
    raise exception using errcode = '22023', message = 'Requested quantity exceeds available stock.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cart_items_validate_quantity on public.cart_items;
create trigger trg_cart_items_validate_quantity
  before insert or update of product_id, quantity on public.cart_items
  for each row execute function public.validate_cart_item_quantity();

create or replace function public.set_cart_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_carts_set_updated_at on public.carts;
create trigger trg_carts_set_updated_at
  before update on public.carts
  for each row execute function public.set_cart_updated_at();

drop trigger if exists trg_cart_items_set_updated_at on public.cart_items;
create trigger trg_cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_cart_updated_at();

create or replace function public.touch_cart_after_item_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.carts
  set updated_at = now()
  where id = coalesce(new.cart_id, old.cart_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_cart_items_touch_cart on public.cart_items;
create trigger trg_cart_items_touch_cart
  after insert or update or delete on public.cart_items
  for each row execute function public.touch_cart_after_item_change();

alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.cart_items replica identity full;

revoke all on table public.carts from anon;
revoke all on table public.cart_items from anon;
grant select, insert, update, delete on table public.carts to authenticated;
grant select, insert, update, delete on table public.cart_items to authenticated;

drop policy if exists "Users read own cart" on public.carts;
create policy "Users read own cart" on public.carts
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create own cart" on public.carts;
create policy "Users create own cart" on public.carts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own cart" on public.carts;
create policy "Users update own cart" on public.carts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own cart" on public.carts;
create policy "Users delete own cart" on public.carts
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users read own cart items" on public.cart_items;
create policy "Users read own cart items" on public.cart_items
  for select to authenticated
  using (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id
        and carts.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users create own cart items" on public.cart_items;
create policy "Users create own cart items" on public.cart_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id
        and carts.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users update own cart items" on public.cart_items;
create policy "Users update own cart items" on public.cart_items
  for update to authenticated
  using (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id
        and carts.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id
        and carts.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users delete own cart items" on public.cart_items;
create policy "Users delete own cart items" on public.cart_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id
        and carts.user_id = (select auth.uid())
    )
  );

-- Adding is atomic: concurrent clicks cannot create duplicate cart rows or
-- push an item's quantity above the product's current stock.
create or replace function public.add_cart_item(
  p_product_id uuid,
  p_quantity integer default 1
)
returns public.cart_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_cart_id uuid;
  v_stock integer;
  v_item public.cart_items;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if p_quantity < 1 then
    raise exception using errcode = '22023', message = 'Quantity must be at least 1.';
  end if;

  v_stock := public.get_active_product_stock_for_cart(p_product_id);

  if p_quantity > v_stock then
    raise exception using errcode = '22023', message = 'Requested quantity exceeds available stock.';
  end if;

  insert into public.carts (user_id)
  values (v_user_id)
  on conflict (user_id) do update
    set updated_at = now()
  returning id into v_cart_id;

  insert into public.cart_items (cart_id, product_id, quantity)
  values (v_cart_id, p_product_id, p_quantity)
  on conflict (cart_id, product_id) do update
    set quantity = public.cart_items.quantity + excluded.quantity
    where public.cart_items.quantity + excluded.quantity <= v_stock
  returning * into v_item;

  if v_item.id is null then
    raise exception using errcode = '22023', message = 'Requested quantity exceeds available stock.';
  end if;

  return v_item;
end;
$$;

-- Quantity changes use the same server-side stock boundary as adding.
create or replace function public.update_cart_item_quantity(
  p_cart_item_id uuid,
  p_quantity integer
)
returns public.cart_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_product_id uuid;
  v_stock integer;
  v_item public.cart_items;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if p_quantity < 1 then
    raise exception using errcode = '22023', message = 'Quantity must be at least 1.';
  end if;

  select cart_items.product_id
  into v_product_id
  from public.cart_items
  join public.carts on carts.id = cart_items.cart_id
  where cart_items.id = p_cart_item_id
    and carts.user_id = auth.uid()
  for update of cart_items;

  if not found then
    raise exception using errcode = 'P0002', message = 'Cart item is not available.';
  end if;

  v_stock := public.get_active_product_stock_for_cart(v_product_id);

  if p_quantity > v_stock then
    raise exception using errcode = '22023', message = 'Requested quantity exceeds available stock.';
  end if;

  update public.cart_items
  set quantity = p_quantity
  where id = p_cart_item_id
  returning * into v_item;

  return v_item;
end;
$$;

grant execute on function public.add_cart_item(uuid, integer) to authenticated;
grant execute on function public.update_cart_item_quantity(uuid, integer) to authenticated;
revoke execute on function public.get_active_product_stock_for_cart(uuid) from public, anon;
grant execute on function public.get_active_product_stock_for_cart(uuid) to authenticated;
revoke execute on function public.add_cart_item(uuid, integer) from public, anon;
revoke execute on function public.update_cart_item_quantity(uuid, integer) from public, anon;
revoke execute on function public.set_cart_updated_at() from public, anon, authenticated;
revoke execute on function public.touch_cart_after_item_change() from public, anon, authenticated;
revoke execute on function public.validate_cart_item_quantity() from public, anon, authenticated;

-- Cart badges stay synchronized across tabs and devices through Supabase
-- Realtime. The block avoids adding the table to the publication twice.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cart_items'
  ) then
    alter publication supabase_realtime add table public.cart_items;
  end if;
end;
$$;
