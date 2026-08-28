-- ════════════════════════════════════════════════════════════════════
--  KAPILA DAIRY · Admin Counter Terminal · RPCs
--  ⚠️  Run AFTER supabase/schema.sql (it needs products/profiles/orders).
--
--  ⚠️  SECURITY NOTE — demo phase:
--  These functions are `security definer` (they bypass RLS) and are
--  callable with the anon key, because the admin panel currently runs
--  in the browser. Access is gated CLIENT-SIDE by the admin login
--  (VITE_ADMIN_USER / VITE_ADMIN_PASS + 3-try lockout).
--
--  BEFORE going live: move the counter to its own backend, authenticate
--  it with a real admin user, and re-create these with
--  `grant execute ... to authenticated` + a check that the caller is the
--  admin (or call them via the service-role key server-side instead).
-- ════════════════════════════════════════════════════════════════════

-- normalise a phone to 10 digits (strips +91 / spaces / dashes)
create or replace function public.norm_phone(t text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    case when length(digits) = 12 and digits like '91%' then substr(digits, 3) else digits end,
    '^0+', ''
  )
  from (select regexp_replace(coalesce(t, ''), '\D', '', 'g') as digits) d;
$$;

-- ── 1 · find a customer khata by phone ─────────────────────────────
create or replace function public.admin_find_customer(p_phone text)
returns table (
  id uuid, name text, phone text, dane integer, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select pr.id, pr.name, coalesce(pr.phone, ''), pr.dane, pr.created_at
      from public.profiles pr
     where public.norm_phone(pr.phone) = public.norm_phone(p_phone)
     limit 1;
end;
$$;

-- ── 2 · spend dane (redeem a reward) — fails if balance is short ───
create or replace function public.admin_spend_dane(p_phone text, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cust uuid;
  new_total integer;
begin
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then
    raise exception 'Dane ki ginti galat hai.';
  end if;

  select pr.id into cust
    from public.profiles pr
   where public.norm_phone(pr.phone) = public.norm_phone(p_phone)
   limit 1;

  if cust is null then
    raise exception 'Is phone pe koi khata nahi hai.';
  end if;

  update public.profiles
     set dane = dane - p_amount, updated_at = now()
   where id = cust and dane >= p_amount
  returning dane into new_total;

  if new_total is null then
    raise exception 'Itna dana khate mein nahi hai.';
  end if;

  return new_total;
end;
$$;

-- ── 3 · credit dane (manual adjustment / goodwill) ─────────────────
create or replace function public.admin_credit_dane(p_phone text, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cust uuid;
  new_total integer;
begin
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then
    raise exception 'Dane ki ginti galat hai.';
  end if;

  select pr.id into cust
    from public.profiles pr
   where public.norm_phone(pr.phone) = public.norm_phone(p_phone)
   limit 1;

  if cust is null then
    raise exception 'Is phone pe koi khata nahi hai.';
  end if;

  update public.profiles
     set dane = dane + p_amount, updated_at = now()
   where id = cust
  returning dane into new_total;

  return new_total;
end;
$$;

-- ── 4 · list recent orders (all customers) ─────────────────────────
create or replace function public.admin_list_orders(p_limit integer default 40)
returns setof public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select * from public.orders
    order by created_at desc
    limit coalesce(p_limit, 40);
end;
$$;

-- ── 5 · mark an order paid (cash/UPI collected at counter) ─────────
create or replace function public.admin_mark_paid(p_order_id text, p_payment_id text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
     set paid = true,
         payment_id = coalesce(p_payment_id, payment_id),
         status = case when status = 'placed' then 'ready' else status end
   where order_id = p_order_id;
end;
$$;

-- ── 6 · set order status (ready / collected / cancelled) ───────────
create or replace function public.admin_set_order_status(p_order_id text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('placed','ready','collected','cancelled') then
    raise exception 'Galat status.';
  end if;
  update public.orders set status = p_status where order_id = p_order_id;
end;
$$;

-- ── 7 · create a walk-in order from the counter ────────────────────
create or replace function public.admin_create_order(
  p_order_id text,
  p_name     text,
  p_phone    text,
  p_pickup   text,
  p_payment  text,
  p_paid     boolean,
  p_total    numeric,
  p_grains   integer,
  p_items    jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cust uuid;
begin
  -- attach the khata if this phone has one
  select pr.id into cust
    from public.profiles pr
   where public.norm_phone(pr.phone) = public.norm_phone(p_phone)
   limit 1;

  insert into public.orders
    (order_id, user_id, customer_id, customer_name, phone, pickup, payment,
     paid, total, grains_earned, items, status)
  values
    (p_order_id, null, cust, p_name, p_phone, p_pickup, p_payment,
     p_paid, p_total, coalesce(p_grains, 0), p_items,
     case when p_paid then 'ready' else 'placed' end);
end;
$$;

-- ── 8 · daily stats for the dashboard ──────────────────────────────
create or replace function public.admin_daily_stats(p_days integer default 7)
returns table (
  day date,
  order_count bigint,
  revenue numeric,
  dane_issued bigint,
  online_orders bigint,
  counter_orders bigint,
  paid_orders bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select date_trunc('day', o.created_at)::date                       as day,
           count(*)                                                    as order_count,
           coalesce(sum(o.total), 0)                                   as revenue,
           coalesce(sum(o.grains_earned), 0)                           as dane_issued,
           count(*) filter (where o.payment = 'online')                as online_orders,
           count(*) filter (where o.payment in ('counter','redeem'))   as counter_orders,
           count(*) filter (where o.paid)                              as paid_orders
      from public.orders o
     where o.status <> 'cancelled'
       and o.created_at >= now() - make_interval(days => coalesce(p_days, 7))
     group by 1
     order by 1 desc;
end;
$$;

-- ── 9 · list ALL products (incl. hidden) ───────────────────────────
create or replace function public.admin_list_products()
returns setof public.products
language plpgsql
security definer
set search_path = public
as $$
begin
  return query select * from public.products order by sort, name;
end;
$$;

-- ── 10 · add / edit a product ──────────────────────────────────────
create or replace function public.admin_upsert_product(
  p_id       text,
  p_name     text,
  p_hindi    text,
  p_category text,
  p_desc     text,
  p_story    text,
  p_heritage text,
  p_craft    jsonb,
  p_purity   jsonb,
  p_since    integer,
  p_image    text,
  p_tag      text,
  p_units    jsonb,
  p_sort     integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.products
    (id, name, hindi, category, "desc", story, heritage, craft, purity, since,
     image, tag, units, sort, is_active)
  values
    (p_id, p_name, p_hindi, p_category, p_desc, p_story, p_heritage, p_craft, p_purity, p_since,
     p_image, p_tag, p_units, coalesce(p_sort, 50), true)
  on conflict (id) do update set
    name     = excluded.name,
    hindi    = excluded.hindi,
    category = excluded.category,
    "desc"   = excluded."desc",
    story    = excluded.story,
    heritage = excluded.heritage,
    craft    = excluded.craft,
    purity   = excluded.purity,
    since    = excluded.since,
    image    = excluded.image,
    tag      = excluded.tag,
    units    = excluded.units,
    sort     = excluded.sort;
end;
$$;

-- ── 11 · show / hide a product ─────────────────────────────────────
create or replace function public.admin_toggle_product(p_id text, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products set is_active = p_active where id = p_id;
end;
$$;

-- ── GRANTS · the counter runs on the anon key in demo mode ─────────
grant execute on function public.norm_phone(text) to anon, authenticated;
grant execute on function public.admin_find_customer(text) to anon, authenticated;
grant execute on function public.admin_spend_dane(text, integer) to anon, authenticated;
grant execute on function public.admin_credit_dane(text, integer) to anon, authenticated;
grant execute on function public.admin_list_orders(integer) to anon, authenticated;
grant execute on function public.admin_mark_paid(text, text) to anon, authenticated;
grant execute on function public.admin_set_order_status(text, text) to anon, authenticated;
grant execute on function public.admin_create_order(text, text, text, text, text, boolean, numeric, integer, jsonb) to anon, authenticated;
grant execute on function public.admin_daily_stats(integer) to anon, authenticated;
grant execute on function public.admin_list_products() to anon, authenticated;
grant execute on function public.admin_upsert_product(text, text, text, text, text, text, text, jsonb, jsonb, integer, text, text, jsonb, integer) to anon, authenticated;
grant execute on function public.admin_toggle_product(text, boolean) to anon, authenticated;
