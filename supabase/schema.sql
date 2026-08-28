-- ════════════════════════════════════════════════════════════════════
--  KAPILA DAIRY · Supabase schema
--  How to run:  Supabase Dashboard → SQL Editor → New query → paste all → Run
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. PRODUCTS  (admin manages these; the shop reads them)
--    `units` is JSON: [{"label":"500 g","price":460}, ...]
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id          text primary key,
  name        text not null,
  hindi       text,
  category    text not null check (category in ('sweets','milk','snacks','drinks')),
  "desc"      text,
  story       text,
  image       text not null,
  tag         text,
  rating      numeric not null default 4.6,
  reviews     integer not null default 0,
  units       jsonb not null,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "products_public_read"  on public.products;
drop policy if exists "products_admin_insert" on public.products;
drop policy if exists "products_admin_update" on public.products;
drop policy if exists "products_admin_delete" on public.products;

-- customers can browse
create policy "products_public_read" on public.products
  for select using (is_active = true);

-- ⚠️  Demo phase: anyone with the anon key can also write.
--     Once the admin panel lands, REMOVE these 3 and use a service-role
--     key on the admin side instead.
create policy "products_admin_insert" on public.products for insert with check (true);
create policy "products_admin_update" on public.products for update using (true) with check (true);
create policy "products_admin_delete" on public.products for delete using (true);

-- ────────────────────────────────────────────────────────────────────
-- 2. ORDERS  (placed by customers, scanned at the counter)
--    `items` is JSON: [{"id":"kaju-katli","name":"Kaju Katli",
--                       "pack":"500 g","qty":1,"price":460}, ...]
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id             bigint generated always as identity primary key,
  order_id       text unique not null,
  customer_name  text not null,
  phone          text not null,
  pickup         text,
  note           text,
  payment        text not null check (payment in ('online','counter')),
  paid           boolean not null default false,
  payment_id     text,
  total          numeric not null,
  grains_earned  integer not null default 0,
  items          jsonb not null,
  status         text not null default 'placed'
                 check (status in ('placed','ready','collected','cancelled')),
  created_at     timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "orders_public_insert" on public.orders;
drop policy if exists "orders_public_read"   on public.orders;
drop policy if exists "orders_admin_update"  on public.orders;

-- customers place orders and can re-open their ticket by order_id
create policy "orders_public_insert" on public.orders for insert with check (true);
create policy "orders_public_read"   on public.orders for select using (true);

-- counter/admin moves status + marks counter payments done
create policy "orders_admin_update" on public.orders for update using (true) with check (true);

-- handy indexes for the admin dashboard later
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);

-- ────────────────────────────────────────────────────────────────────
-- 3. CUSTOMERS  (Sakhar ke Dane loyalty ledger)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.customers (
  phone       text primary key,
  name        text not null,
  points      integer not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.customers enable row level security;

drop policy if exists "customers_read"   on public.customers;
drop policy if exists "customers_insert" on public.customers;
drop policy if exists "customers_update" on public.customers;

create policy "customers_read"   on public.customers for select using (true);
create policy "customers_insert" on public.customers for insert with check (true);
create policy "customers_update" on public.customers for update using (true) with check (true);

-- ────────────────────────────────────────────────────────────────────
-- 4. REVENUE VIEW  (powers the admin dashboard charts later)
-- ────────────────────────────────────────────────────────────────────
create or replace view public.kapila_daily_revenue as
select
  date_trunc('day', created_at)::date  as day,
  count(*)                             as order_count,
  coalesce(sum(total), 0)              as revenue,
  coalesce(sum(grains_earned), 0)      as dane_issued,
  count(*) filter (where payment = 'online')  as online_orders,
  count(*) filter (where payment = 'counter') as counter_orders
from public.orders
where status <> 'cancelled'
group by 1
order by 1 desc;

-- ────────────────────────────────────────────────────────────────────
-- 5. STORAGE BUCKET  (admin uploads photos of new mithai later)
-- ────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('kapila', 'kapila', true)
on conflict (id) do nothing;

drop policy if exists "kapila_public_read" on storage.objects;
drop policy if exists "kapila_upload"      on storage.objects;

create policy "kapila_public_read" on storage.objects
  for select using (bucket_id = 'kapila');
create policy "kapila_upload" on storage.objects
  for insert with check (bucket_id = 'kapila');

-- ────────────────────────────────────────────────────────────────────
-- 6. SEED DATA  (optional — 3 live products so the shop reads from
--    Supabase instead of the offline fallback)
-- ────────────────────────────────────────────────────────────────────
insert into public.products (id, name, hindi, category, "desc", story, image, tag, rating, reviews, units, sort) values
(
  'malai-doodh',
  'Malai Wala Doodh',
  'मलाई वाला दूध',
  'milk',
  'Gaay ka taaza doodh — subah ki doh ka, dohre ubale ke paaste wali malai ke saath.',
  'Subah 4 baje ki doh, 6 baje tak aapke ghar. Dadaji kehti thi — doodh mein paani, ghar mein paap.',
  '/images/milk.jpg',
  'Bestseller',
  4.9, 312,
  '[{"label":"500 ml","price":30},{"label":"1 Litre","price":60},{"label":"2 Litre","price":115}]'::jsonb,
  1
),
(
  'kaju-katli',
  'Kaju Katli',
  'काजू कतली',
  'sweets',
  'Assam ke premium kaju, dhire-dhire pakki chashni — upar chandi ka vark.',
  'Halwai Chacha ki 40 saal purani recipe. Katli nahi, ehsaan hai.',
  '/images/kaju-katli.jpg',
  'Shaadi Special',
  4.8, 240,
  '[{"label":"250 g","price":240},{"label":"500 g","price":460},{"label":"1 kg","price":900}]'::jsonb,
  2
),
(
  'motichoor-laddoo',
  'Motichoor Laddoo',
  'मोतीचूर लड्डू',
  'sweets',
  'Boondi ke bareek moti, desi ghee mein tale — muh mein ghul jaate hain.',
  'Diwali pe Dadaji poore gaon ko khilate the. Aap ghar baithe mangwao.',
  '/images/laddoo.jpg',
  'Ghar Jaisa',
  4.7, 198,
  '[{"label":"250 g","price":130},{"label":"500 g","price":250},{"label":"1 kg","price":480}]'::jsonb,
  3
)
on conflict (id) do nothing;

-- Done! 🍬  Ab site refresh karo — woh Supabase se products padhegi.
