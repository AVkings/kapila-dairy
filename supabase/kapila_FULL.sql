-- ════════════════════════════════════════════════════════════════════
--  KAPILA DAIRY · Supabase FULL SCHEMA (v3)
--  Dashboard → SQL Editor → New query → paste ALL → Run
--  Idempotent: re-run safe. Yeh purane v1/v2 tables & functions ko
--  hata kar clean secure system banata hai.
--
--  SECURITY (demo phase):
--  admin_* functions `security definer` hain aur anon key se callable
--  hain kyunki admin panel abhi browser mein chalta hai (client-side
--  login + 3-try lockout se gated). LIVE se pehle inhe service-role
--  key se server-side call karo.
-- ════════════════════════════════════════════════════════════════════

-- ── STEP 0 · PURANA SYSTEM HATAO (safe even if nothing exists) ──────
drop table if exists public.customers cascade;
drop view  if exists public.kapila_daily_revenue;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.add_dane(integer) cascade;
drop function if exists public.redeem_dane(integer) cascade;
drop function if exists public.admin_find_customer(text) cascade;
drop function if exists public.admin_spend_dane(text, integer) cascade;
drop function if exists public.admin_credit_dane(text, integer) cascade;
drop function if exists public.admin_create_customer(text, text, integer) cascade;
drop function if exists public.admin_list_orders(integer) cascade;
drop function if exists public.admin_mark_paid(text, text) cascade;
drop function if exists public.admin_set_order_status(text, text) cascade;
drop function if exists public.admin_create_order(text, text, text, text, text, boolean, numeric, integer, jsonb) cascade;
drop function if exists public.admin_daily_stats(integer) cascade;
drop function if exists public.admin_list_products() cascade;
drop function if exists public.admin_upsert_product(text, text, text, text, text, text, text, jsonb, jsonb, integer, text, text, jsonb, integer) cascade;
drop function if exists public.admin_toggle_product(text, boolean) cascade;
drop function if exists public.get_pay_order(text) cascade;
drop function if exists public.confirm_online_payment(text, text) cascade;

-- ── STEP 1 · PRODUCTS ───────────────────────────────────────────────
create table if not exists public.products (
  id          text primary key,
  name        text not null,
  hindi       text,
  category    text not null check (category in ('sweets','dairy','snacks','drinks')),
  "desc"      text,
  story       text,
  heritage    text,
  craft       jsonb,
  purity      jsonb,
  since       integer,
  image       text not null,
  tag         text,
  rating      numeric not null default 4.6,
  reviews     integer not null default 0,
  units       jsonb not null,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.products
  add column if not exists heritage text,
  add column if not exists craft    jsonb,
  add column if not exists purity   jsonb,
  add column if not exists since    integer;

alter table public.products enable row level security;
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (is_active = true);

-- ── STEP 2 · PROFILES (auth se judi — signup pe auto-banti hai) ─────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default 'Kapila Guest',
  phone       text,
  dane        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profile_read_own" on public.profiles;
create policy "profile_read_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profile_insert_own" on public.profiles;
create policy "profile_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- trigger: naya user signup karte hi profile banao
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Kapila Guest'),
    coalesce(new.phone, new.raw_user_meta_data->>'phone')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── STEP 3 · CUSTOMER RPCs (secure, apna khata) ─────────────────────
create or replace function public.add_dane(amount integer)
returns integer language plpgsql security definer set search_path = public as $$
declare new_total integer;
begin
  if auth.uid() is null then raise exception 'Login zaroori hai — khata pehle kholo.'; end if;
  if amount is null or amount < 0 or amount > 100000 then raise exception 'Dane ki ginti galat hai.'; end if;
  update public.profiles set dane = dane + amount, updated_at = now()
   where id = auth.uid() returning dane into new_total;
  if new_total is null then
    insert into public.profiles (id, dane) values (auth.uid(), amount) returning dane into new_total;
  end if;
  return new_total;
end; $$;

create or replace function public.redeem_dane(amount integer)
returns integer language plpgsql security definer set search_path = public as $$
declare new_total integer;
begin
  if auth.uid() is null then raise exception 'Login zaroori hai — khata pehle kholo.'; end if;
  if amount is null or amount <= 0 or amount > 100000 then raise exception 'Dane ki ginti galat hai.'; end if;
  update public.profiles set dane = dane - amount, updated_at = now()
   where id = auth.uid() and dane >= amount returning dane into new_total;
  if new_total is null then raise exception 'Itna dana khate mein nahi hai.'; end if;
  return new_total;
end; $$;

-- ── STEP 4 · ORDERS ─────────────────────────────────────────────────
create table if not exists public.orders (
  id             bigint generated always as identity primary key,
  order_id       text unique not null,
  user_id        uuid references auth.users(id),
  customer_id    uuid references public.profiles(id),
  customer_name  text not null,
  phone          text not null,
  pickup         text,
  note           text,
  payment        text not null check (payment in ('online','counter','redeem')),
  paid           boolean not null default false,
  payment_id     text,
  total          numeric not null,
  grains_earned  integer not null default 0,
  items          jsonb not null,
  redeem         jsonb,
  status         text not null default 'placed'
                 check (status in ('placed','ready','collected','cancelled')),
  created_at     timestamptz not null default now()
);
alter table public.orders
  add column if not exists redeem jsonb,
  add column if not exists customer_id uuid,
  add column if not exists user_id uuid;

alter table public.orders enable row level security;
drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders
  for insert with check (user_id is null or user_id = auth.uid());
drop policy if exists "orders_read_own" on public.orders;
create policy "orders_read_own" on public.orders
  for select using (user_id is not null and user_id = auth.uid());

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);

-- ── STEP 5 · helper ─────────────────────────────────────────────────
create or replace function public.norm_phone(t text)
returns text language sql immutable as $$
  select regexp_replace(
    case when length(digits) = 12 and digits like '91%' then substr(digits, 3) else digits end,
    '^0+', ''
  )
  from (select regexp_replace(coalesce(t, ''), '\D', '', 'g') as digits) d;
$$;

-- ── STEP 6 · ADMIN COUNTER RPCs (security definer) ─────────────────
create or replace function public.admin_find_customer(p_phone text)
returns table (id uuid, name text, phone text, dane integer, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select pr.id, pr.name, coalesce(pr.phone, ''), pr.dane, pr.created_at
      from public.profiles pr
     where public.norm_phone(pr.phone) = public.norm_phone(p_phone)
     limit 1;
end; $$;

create or replace function public.admin_spend_dane(p_phone text, p_amount integer)
returns integer language plpgsql security definer set search_path = public as $$
declare cust uuid; new_total integer;
begin
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then raise exception 'Dane ki ginti galat hai.'; end if;
  select pr.id into cust from public.profiles pr
   where public.norm_phone(pr.phone) = public.norm_phone(p_phone) limit 1;
  if cust is null then raise exception 'Is phone pe koi khata nahi hai.'; end if;
  update public.profiles set dane = dane - p_amount, updated_at = now()
   where id = cust and dane >= p_amount returning dane into new_total;
  if new_total is null then raise exception 'Itna dana khate mein nahi hai.'; end if;
  return new_total;
end; $$;

create or replace function public.admin_credit_dane(p_phone text, p_amount integer)
returns integer language plpgsql security definer set search_path = public as $$
declare cust uuid; new_total integer;
begin
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then raise exception 'Dane ki ginti galat hai.'; end if;
  select pr.id into cust from public.profiles pr
   where public.norm_phone(pr.phone) = public.norm_phone(p_phone) limit 1;
  if cust is null then raise exception 'Is phone pe koi khata nahi hai.'; end if;
  update public.profiles set dane = dane + p_amount, updated_at = now()
   where id = cust returning dane into new_total;
  return new_total;
end; $$;

-- counter se naya customer banao (khata kholo)
create or replace function public.admin_create_customer(p_name text, p_phone text, p_dane integer default 0)
returns table (id uuid, name text, phone text, dane integer, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if p_name is null or length(trim(p_name)) < 2 then raise exception 'Naam toh do ji.'; end if;
  if public.norm_phone(p_phone) !~ '^[0-9]{10}$' then raise exception 'Phone 10 digit ka hona chahiye.'; end if;

  -- agar is phone pe khata pehle se hai, wapas wahi do
  select pr.id into new_id from public.profiles pr
   where public.norm_phone(pr.phone) = public.norm_phone(p_phone) limit 1;

  if new_id is null then
    insert into public.profiles (id, name, phone, dane)
    values (gen_random_uuid(), trim(p_name), public.norm_phone(p_phone), greatest(coalesce(p_dane,0),0))
    returning id into new_id;
  end if;

  return query
    select pr.id, pr.name, coalesce(pr.phone, ''), pr.dane, pr.created_at
      from public.profiles pr where pr.id = new_id;
end; $$;

create or replace function public.admin_list_orders(p_limit integer default 40)
returns setof public.orders language plpgsql security definer set search_path = public as $$
begin
  return query select * from public.orders order by created_at desc limit coalesce(p_limit, 40);
end; $$;

create or replace function public.admin_mark_paid(p_order_id text, p_payment_id text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders
     set paid = true,
         payment_id = coalesce(p_payment_id, payment_id),
         status = case when status = 'placed' then 'ready' else status end
   where order_id = p_order_id;
end; $$;

create or replace function public.admin_set_order_status(p_order_id text, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('placed','ready','collected','cancelled') then raise exception 'Galat status.'; end if;
  update public.orders set status = p_status where order_id = p_order_id;
end; $$;

create or replace function public.admin_create_order(
  p_order_id text, p_name text, p_phone text, p_pickup text, p_payment text,
  p_paid boolean, p_total numeric, p_grains integer, p_items jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare cust uuid;
begin
  select pr.id into cust from public.profiles pr
   where public.norm_phone(pr.phone) = public.norm_phone(p_phone) limit 1;
  insert into public.orders
    (order_id, user_id, customer_id, customer_name, phone, pickup, payment,
     paid, total, grains_earned, items, status)
  values
    (p_order_id, null, cust, p_name, p_phone, p_pickup, p_payment,
     p_paid, p_total, coalesce(p_grains, 0), p_items,
     case when p_paid then 'ready' else 'placed' end);
  -- walk-in customer ke khate mein dane bhi jod do
  if cust is not null and coalesce(p_grains,0) > 0 then
    update public.profiles set dane = dane + p_grains, updated_at = now() where id = cust;
  end if;
end; $$;

create or replace function public.admin_daily_stats(p_days integer default 7)
returns table (day date, order_count bigint, revenue numeric, dane_issued bigint,
               online_orders bigint, counter_orders bigint, paid_orders bigint)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select date_trunc('day', o.created_at)::date as day,
           count(*) as order_count,
           coalesce(sum(o.total), 0) as revenue,
           coalesce(sum(o.grains_earned), 0) as dane_issued,
           count(*) filter (where o.payment = 'online') as online_orders,
           count(*) filter (where o.payment in ('counter','redeem')) as counter_orders,
           count(*) filter (where o.paid) as paid_orders
      from public.orders o
     where o.status <> 'cancelled'
       and o.created_at >= now() - (coalesce(p_days, 7) || ' days')::interval
     group by 1 order by 1 desc;
end; $$;

create or replace function public.admin_list_products()
returns setof public.products language plpgsql security definer set search_path = public as $$
begin
  return query select * from public.products order by sort, name;
end; $$;

create or replace function public.admin_upsert_product(
  p_id text, p_name text, p_hindi text, p_category text, p_desc text, p_story text,
  p_heritage text, p_craft jsonb, p_purity jsonb, p_since integer, p_image text,
  p_tag text, p_units jsonb, p_sort integer
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_category not in ('sweets','dairy','snacks','drinks') then raise exception 'Galat category.'; end if;
  insert into public.products
    (id, name, hindi, category, "desc", story, heritage, craft, purity, since,
     image, tag, units, sort, is_active)
  values
    (p_id, p_name, p_hindi, p_category, p_desc, p_story, p_heritage, p_craft,
     p_purity, p_since, p_image, nullif(p_tag, ''), p_units, coalesce(p_sort, 99), true)
  on conflict (id) do update set
    name = excluded.name, hindi = excluded.hindi, category = excluded.category,
    "desc" = excluded."desc", story = excluded.story, heritage = excluded.heritage,
    craft = excluded.craft, purity = excluded.purity, since = excluded.since,
    image = excluded.image, tag = excluded.tag, units = excluded.units, sort = excluded.sort;
end; $$;

create or replace function public.admin_toggle_product(p_id text, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.products set is_active = p_active where id = p_id;
end; $$;

-- ── STEP 7 · PAYMENT LINK FLOW (Razorpay exact-amount) ─────────────
create or replace function public.get_pay_order(p_order text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare out jsonb;
begin
  select jsonb_build_object(
    'order_id', o.order_id, 'customer_name', o.customer_name, 'phone', o.phone,
    'total', o.total, 'paid', o.paid, 'payment', o.payment, 'status', o.status,
    'pickup', o.pickup, 'redeem', o.redeem, 'items', o.items
  ) into out from public.orders o where o.order_id = p_order limit 1;
  return out;
end; $$;

create or replace function public.confirm_online_payment(p_order text, p_payment_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare updated_rows integer;
begin
  update public.orders
     set paid = true, payment = 'online', payment_id = p_payment_id,
         status = case when status = 'placed' then 'ready' else status end
   where order_id = p_order and paid = false and payment <> 'redeem';
  get diagnostics updated_rows = row_count;
  return updated_rows > 0;
end; $$;

create table if not exists public.razorpay_webhook_log (
  id bigint generated always as identity primary key,
  event text, payload jsonb, verified boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.razorpay_webhook_log enable row level security;

-- ── STEP 8 · REVENUE VIEW ───────────────────────────────────────────
create or replace view public.kapila_daily_revenue as
select
  date_trunc('day', created_at)::date as day,
  count(*) as order_count,
  coalesce(sum(total), 0) as revenue,
  coalesce(sum(grains_earned), 0) as dane_issued,
  count(*) filter (where payment = 'online') as online_orders,
  count(*) filter (where payment = 'counter') as counter_orders,
  count(*) filter (where paid) as paid_orders
from public.orders where status <> 'cancelled'
group by 1 order by 1 desc;

-- ── STEP 9 · STORAGE BUCKET ─────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('kapila', 'kapila', true)
on conflict (id) do nothing;

-- ── STEP 10 · GRANTS ────────────────────────────────────────────────
grant execute on function public.add_dane(integer) to authenticated;
grant execute on function public.redeem_dane(integer) to authenticated;
grant execute on function public.norm_phone(text) to anon, authenticated;
grant execute on function public.admin_find_customer(text) to anon, authenticated;
grant execute on function public.admin_spend_dane(text, integer) to anon, authenticated;
grant execute on function public.admin_credit_dane(text, integer) to anon, authenticated;
grant execute on function public.admin_create_customer(text, text, integer) to anon, authenticated;
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

-- ── STEP 11 · SEED DATA (3 sample products) ─────────────────────────
insert into public.products
  (id, name, hindi, category, "desc", story, heritage, craft, purity, since,
   image, tag, rating, reviews, units, sort)
values
(
  'kaju-katli', 'Kaju Katli', 'काजू कतली', 'sweets',
  'Slow-cooked cashew fudge, finished with pure silver varq.',
  'Sirf Goan kaju, thoda sa cheeni, aur Dadi ji ki 50 saal purani technique. Har katli haath se beli jaati hai.',
  '1982 mein Dadi Sushila ne pehli baar sang-e-marmar pe katli beli thi. Aaj bhi har katli usi patthar pe haath se kat-ti hai, aur shaadi ke dabbe mein pehli rakhi jaati hai.',
  '["Konkan ke W-320 grade kaju raat bhar bhigote hain","Patli ek-taar chashni mein 40 minute dheema pakna","Sangmarmar ke patthar pe haath se belna aur kaatna","Upar chandi ka asli khaane layak varq"]'::jsonb,
  '["100% kaju — maida zero","Asli chandi ka varq","Cheeni kam, kaju zyada","Bina essence, bina rang"]'::jsonb,
  1982,
  'https://image.qwenlm.ai/generated-images/c6f005fb-bb33-4b43-ba70-95f2fc3ff2a3/_result.png',
  'Sabse Bikau', 4.9, 812,
  '[{"label":"250g","price":230},{"label":"500g","price":440},{"label":"1 kg","price":860}]'::jsonb, 2
),
(
  'motichoor-laddoo', 'Motichoor Laddoo', 'मोतीचूर लड्डू', 'sweets',
  'Tiny boondi pearls bound in warm ghee — melts before you blink.',
  'Boondi ek-ek moti jaisi, desi ghee mein tala hua, aur pistachiyon ki chaadar.',
  'Yehi woh laddoo hai jisse dhaaba shuru hua — 1974 ki Diwali pe Dadaji ne poore mohalle ko khilaya tha.',
  '["Besan ko peetal ke jhaare se moti-moti boondi mein utaarte hain","Apne bilona ghee mein halki aanch pe sone jaisa talna","Ek-taar chashni mein boondi ko bhigona","Haath ki hatheli pe garam-garam laddoo baandhna"]'::jsonb,
  '["Apna bilona desi ghee","Kesar ka rang — food colour nahi","Boondi moti, daant nahi lagti","Roz subah taaza"]'::jsonb,
  1974,
  'https://image.qwenlm.ai/generated-images/7db3dcd4-d40d-4951-a590-0879d4bbecd1/_result.png',
  'Shaadi Season', 4.8, 640,
  '[{"label":"250g","price":110},{"label":"500g","price":200},{"label":"1 kg","price":380}]'::jsonb, 3
),
(
  'taaza-doodh', 'Taaza A2 Doodh', 'ताज़ा दूध', 'dairy',
  'Farm-to-door A2 cow milk — bottled within 2 hours of milking.',
  'Hamari gaayein sirf A2. Doodh subah 4 baje nikalta hai, 6 baje bottle mein, 7 baje aapke dhaabe tak.',
  'Dadaji Ramkishan ne 1974 mein yehi dhaaba 2 gaayon aur 1 cycle se shuru kiya tha. Aaj 40+ desi gaayein hain.',
  '["Subah 4 baje — har gaay ke naam se, haath se doh","Turant thanda karke 63°C pe dheema pasteurise","Bina homogenise kiye — malai upar khud jamti hai","Kaanch ki bottle mein, subah 7 baje se pehle aap tak"]'::jsonb,
  '["100% A2 desi gaay","No preservatives","Paani nahi, powder nahi","Sirf kaanch ki bottle"]'::jsonb,
  1974,
  'https://image.qwenlm.ai/generated-images/bca00f28-4cee-427e-8f1e-31d75f9c2e3f/_result.png',
  'A2 Gaay', 5.0, 1024,
  '[{"label":"500 ml","price":33},{"label":"1 litre","price":66},{"label":"2 litre","price":130}]'::jsonb, 1
)
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════════
--  Test:  select * from public.admin_daily_stats(7);
--         select public.admin_create_customer('Test Ji', '9999999999', 10);
-- ════════════════════════════════════════════════════════════════════
