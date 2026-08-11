-- Catchus homepage New Arrivals management.
-- Reuses products.featured for selection and adds only an independent image URL.
-- Apply after schema.sql and customer_auth.sql.

alter table public.products
  add column if not exists new_arrival_image_url text;

comment on column public.products.new_arrival_image_url is
  'Dedicated homepage New Arrivals thumbnail. Independent from product_images.';

-- Remove the earlier development trigger name if that draft was applied.
drop trigger if exists enforce_best_seller_limit on public.products;
drop function if exists public.enforce_best_seller_limit();

create or replace function public.enforce_new_arrival_selection()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.featured then
    if new.status <> 'active' then
      raise exception using
        errcode = '23514',
        message = 'new_arrival_active_required';
    end if;

    if nullif(btrim(new.new_arrival_image_url), '') is null then
      raise exception using
        errcode = '23514',
        message = 'new_arrival_thumbnail_required';
    end if;

    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.featured is distinct from true) then
      -- Serialize competing selections so two admin sessions cannot both claim
      -- the final available slot at the same time.
      perform pg_advisory_xact_lock(hashtextextended('catchus-new-arrival-limit', 0));

      if (
        select count(*)
        from public.products
        where featured = true
          and id is distinct from new.id
      ) >= 2 then
        raise exception using
          errcode = '23514',
          message = 'new_arrival_limit_reached';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_new_arrival_selection() from public;

drop trigger if exists enforce_new_arrival_selection on public.products;
create trigger enforce_new_arrival_selection
  before insert or update of featured, new_arrival_image_url, status on public.products
  for each row execute function public.enforce_new_arrival_selection();
