-- ════════════════════════════════════════════════════════════════════
--  KAPILA DAIRY · Admin Counter + Payment RPCs · v3 (CLEAN)
--  ⚠️  Run AFTER supabase/schema.sql.
--  ⚠️  Yeh file purane versions ko PURA replace karti hai — har function
--      pehle DROP hota hai, phir banta hai, isliye koi purana overload
--      ya adhoora script problem nahi karega. Poora paste karo → Run.
--
--  ⚠️  SECURITY NOTE — demo phase:
--  admin_* functions `security definer` hain aur anon key se callable
--  hain (admin panel browser mein chalta hai; access client-side login
--  + 3-try lockout se gated hai). LIVE jaane se pehle counter ko apne
--  backend pe le jao aur service-role key se call karo.
-- ════════════════════════════════════════════════════════════════════

-- ── helpers ─────────────────────────────────────────────────────────
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

-- ── 1 · customer khata by phone ─────────────────────────────────────
drop function if exists public.admin_find_customer(text);
create function public.admin_find_customer(p_phone text)
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

-- ── 2 · spend dane (redeem reward) ──────────────────────────────────
drop function if exists public.admin_spend_dane(text, integer);
create function public.admin_spend_dane(p_phone text, p_amount integer)
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

-- ── 3 · credit dane (manual / goodwill) ─────────────────────────────
drop function if exists public.admin_credit_dane(text, integer);
create function public.admin_credit_dane(p_phone text, p_amount integer)
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

-- ── 4 · recent orders (all customers) ───────────────────────────────
drop function if exists public.admin_list_orders(integer);
create function public.admin_list_orders(p_limit integer default 40)
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

-- ── 5 · mark paid (cash/UPI at counter) ─────────────────────────────
drop function if exists public.admin_mark_paid(text, text);
create function public.admin_mark_paid(p_order_id text, p_payment_id text default null)
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

-- ── 6 · set order status ────────────────────────────────────────────
drop function if exists public.admin_set_order_status(text, text);
create function public.admin_set_order_status(p_order_id text, p_status text)
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

-- ── 7 · walk-in order from counter ──────────────────────────────────
drop function if exists public.admin_create_order(text, text, text, text, text, boolean, numeric, integer, jsonb);
create function public.admin_create_order(
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

-- ── 8 · dashboard daily stats ───────────────────────────────────────
drop function if exists public.admin_daily_stats(integer);
create function public.admin_daily_stats(p_days integer default 7)
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
       and o.created_at >= now() - (coalesce(p_days, 7) || ' days')::interval
     group by 1
     order by 1 desc;
end;
$$;

-- ── 9 · ALL products (incl. hidden) ─────────────────────────────────
drop function if exists public.admin_list_products();
create function public.admin_list_products()
returns setof public.products
language plpgsql
security definer
set search_path = public
as $$
begin
  return query select * from public.products order by sort, name;
end;
$$;

-- ── 10 · add / edit product ─────────────────────────────────────────
drop function if exists public.admin_upsert_product(text, text, text, text, text, text, text, jsonb, jsonb, integer, text, text, jsonb, integer);
create function public.admin_upsert_product(
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
  if p_category not in ('sweets','dairy','snacks','drinks') then
    raise exception 'Galat category.';
  end if;

  insert into public.products
    (id, name, hindi, category, "desc", story, heritage, craft, purity, since,
     image, tag, units, sort, is_active)
  values
    (p_id, p_name, p_hindi, p_category, p_desc, p_story, p_heritage, p_craft,
     p_purity, p_since, p_image, nullif(p_tag, ''), p_units, coalesce(p_sort, 99), true)
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

-- ── 11 · show / hide product ────────────────────────────────────────
drop function if exists public.admin_toggle_product(text, boolean);
create function public.admin_toggle_product(p_id text, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products set is_active = p_active where id = p_id;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
--  PAYMENT LINK FLOW (Razorpay exact-amount)
-- ════════════════════════════════════════════════════════════════════

-- ── 12 · public pay page ka data (order ID se) ──────────────────────
drop function if exists public.get_pay_order(text);
create function public.get_pay_order(p_order text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  out jsonb;
begin
  select jsonb_build_object(
    'order_id',      o.order_id,
    'customer_name', o.customer_name,
    'phone',         o.phone,
    'total',         o.total,
    'paid',          o.paid,
    'payment',       o.payment,
    'status',        o.status,
    'pickup',        o.pickup,
    'redeem',        o.redeem,
    'items',         o.items
  ) into out
    from public.orders o
   where o.order_id = p_order
   limit 1;

  return out; -- null agar order nahi mila
end;
$$;

-- ── 13 · checkout success → order PAID ──────────────────────────────
--  Demo bridge: customer device Razorpay checkout se paymentId laata hai.
--  PRODUCTION mein isko hata kar sirf razorpay_webhook edge function se
--  paid mark karo (server-side signature verify) — woh code
--  supabase/functions/razorpay_webhook mein hai.
drop function if exists public.confirm_online_payment(text, text);
create function public.confirm_online_payment(p_order text, p_payment_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  update public.orders
     set paid       = true,
         payment    = 'online',
         payment_id = p_payment_id,
         status     = case when status = 'placed' then 'ready' else status end
   where order_id = p_order
     and paid = false
     and payment <> 'redeem';

  get diagnostics updated_rows = row_count;

  -- logged-in customer ke khate mein dane bhi judwa do (agar pending thay)
  return updated_rows > 0;
end;
$$;

-- ── 14 · webhook log (production Razorpay webhook ke liye) ──────────
create table if not exists public.razorpay_webhook_log (
  id          bigint generated always as identity primary key,
  event       text,
  payload     jsonb,
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.razorpay_webhook_log enable row level security;
-- sirf service-role (edge function) likhega — koi policy nahi chahiye

-- ── grants ──────────────────────────────────────────────────────────
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
grant execute on function public.get_pay_order(text) to anon, authenticated;
grant execute on function public.confirm_online_payment(text, text) to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════
--  DONE. Test:  select * from public.admin_daily_stats(7);
--  aur          select public.get_pay_order('KD-XXXX');
-- ════════════════════════════════════════════════════════════════════
