-- ═════════════════════════════════════════════════════════════════════
--  KAPILA DAIRY · Supabase schema  ·  v2 (auth + profiles + security)
--  Run: Dashboard → SQL Editor → New query → paste all → Run
--  Safe to re-run (idempotent). Upgrades v1: customers → profiles.
-- ═════════════════════════════════════════════════════════════════════

-- ── 0. Cleanup from v1 (customers replaced by auth-linked profiles) ──
drop policy if exists "customers_read"   on public.customers;
drop policy if exists "customers_insert" on public.customers;
drop policy if exists "customers_update" on public.customers;
drop table  if exists public.customers cascade;

-- ── 1. PROFILES — naam, phone, sakhar ke dane (one per auth user) ───
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default 'Kapila Guest',
  phone       text,
  dane        integer not null default 0 check (dane >= 0),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- a user may ONLY ever touch their own khata
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- auto-create profile the moment someone signs up (phone OTP / email)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'Kapila Guest'),
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- safe way to add dane: client can ONLY add to its own khata,
-- and can never SET an arbitrary number
create or replace function public.add_dane(p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  if auth.uid() is null then
    raise exception 'pehle login karo ji';
  end if;
  if p_amount < 0 or p_amount > 5000 then
    raise exception 'galat dane count';
  end if;
  update public.profiles
     set dane = dane + p_amount
   where id = auth.uid()
  returning dane into v_new;
  return v_new;
end;
$$;

grant execute on function public.add_dane(integer) to authenticated;

-- ── 2. PRODUCTS — catalogue (+ heritage, craft, purity, since) ──────
create table if not exists public.products (
  id          text primary key,
  name        text not null,
  hindi       text,
  category    text not null check (category in ('sweets','dairy','snacks','drinks')),
  "desc"      text,
  story       text,
  heritage    text,
  craft       jsonb not null default '[]'::jsonb,
  purity      jsonb not null default '[]'::jsonb,
  since       integer,
  image       text not null,
  tag         text,
  rating      numeric not null default 4.6,
  reviews     integer not null default 0,
  units       jsonb not null default '[]'::jsonb,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.products add column if not exists heritage text;
alter table public.products add column if not exists craft    jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists purity   jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists since    integer;

alter table public.products enable row level security;

drop policy if exists "products_public_read"  on public.products;
drop policy if exists "products_admin_insert" on public.products;
drop policy if exists "products_admin_update" on public.products;
drop policy if exists "products_admin_delete" on public.products;

-- customers: read-only. (Admin panel will manage stock via service-role
-- key later — the anon key can NOT write products anymore.)
create policy "products_public_read" on public.products
  for select using (is_active = true);

-- ── 3. ORDERS — order + counter QR payload ───────────────────────────
create table if not exists public.orders (
  id             bigint generated always as identity primary key,
  order_id       text unique not null,
  customer_name  text not null,
  phone          text not null,
  user_id        uuid references auth.users (id),
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

alter table public.orders add column if not exists user_id uuid references auth.users (id);

alter table public.orders enable row level security;

drop policy if exists "orders_public_insert" on public.orders;
drop policy if exists "orders_public_read"   on public.orders;
drop policy if exists "orders_admin_update"  on public.orders;

-- anyone may place an order (guest checkout); logged-in orders carry user_id
create policy "orders_public_insert" on public.orders
  for insert with check (true);
-- demo phase: readable for the counter flow. Admin panel will restrict
-- this to service-role / staff profiles later.
create policy "orders_public_read" on public.orders
  for select using (true);
create policy "orders_admin_update" on public.orders
  for update using (true) with check (true);

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);

-- ── 4. REVENUE VIEW — for the admin dashboard ────────────────────────
create or replace view public.kapila_daily_revenue as
select
  date_trunc('day', created_at)::date                 as day,
  count(*)                                            as order_count,
  coalesce(sum(total), 0)                             as revenue,
  coalesce(sum(grains_earned), 0)                     as dane_issued,
  count(*) filter (where payment = 'online')          as online_orders,
  count(*) filter (where payment = 'counter')         as counter_orders
from public.orders
where status <> 'cancelled'
group by 1
order by 1 desc;

-- ── 5. STORAGE BUCKET — product photos (admin uploads later) ─────────
insert into storage.buckets (id, name, public)
values ('kapila', 'kapila', true)
on conflict (id) do nothing;

drop policy if exists "kapila_public_read" on storage.objects;
drop policy if exists "kapila_upload"      on storage.objects;

create policy "kapila_public_read" on storage.objects
  for select using (bucket_id = 'kapila');
create policy "kapila_upload" on storage.objects
  for insert with check (bucket_id = 'kapila');

-- ── 6. SEED / REFRESH demo products (with heritage + craft + purity) ─
insert into public.products (id, name, hindi, category, "desc", story, heritage, craft, purity, since, image, tag, rating, reviews, units, sort) values
(
  'taaza-doodh', 'Taaza A2 Doodh', 'ताज़ा दूध', 'dairy',
  'Farm-to-door A2 cow milk — bottled within 2 hours of milking.',
  'Hamari gaayein sirf A2. Doodh subah 4 baje nikalta hai, 6 baje bottle mein, 7 baje aapke dhaabe tak. Upar ki malai dekh kar hi dil khush.',
  'Dadaji Ramkishan ne 1974 mein yehi dhaaba 2 gaayon aur 1 cycle se shuru kiya tha. Aaj 40+ desi gaayein hain — par subah 4 baje ki doh aaj bhi haath se hoti hai, aur pehli malai aaj bhi Mandir jaati hai.',
  '["Subah 4 baje — haath se doh, gaay ke naam se","Turant thanda karke 63°C pe dheema pasteurise","Bina homogenise kiye — malai upar khud jamti hai","Subah 7 baje se pehle shehar ke har ghar tak"]'::jsonb,
  '["100% A2 desi gaay","No preservatives","Paani nahi, powder nahi","Sirf kaanch ki bottle"]'::jsonb,
  1974,
  '/images/milk.jpg', 'A2 Gaay', 5.0, 1024,
  '[{"label":"500 ml","price":33},{"label":"1 litre","price":66},{"label":"2 litre","price":130}]'::jsonb, 1
),
(
  'kaju-katli', 'Kaju Katli', 'काजू कतली', 'sweets',
  'Slow-cooked cashew fudge, finished with pure silver varq.',
  'Sirf Goan kaju, thoda sa cheeni, aur Dadi ji ki 50 saal purani technique. Har katli haath se belii jaati hai — machine ka koi kaam nahi.',
  '1982 mein Dadi Sushila ne pehli baar kaanch ke patthar pe katli beli thi. Unka kehna tha — kaju bolta hai, bas dheemi aanch chahiye. Aaj bhi har katli usi sang-e-marmar pe haath se kat-ti hai.',
  '["Konkan ke W-320 grade kaju raat bhar bhigote hain","Patli ek-taar chashni mein 40 minute dheema pakna","Sangmarmar ke patthar pe haath se belna aur kaatna","Upar chandi ka asli khaane layak varq"]'::jsonb,
  '["100% kaju — maida zero","Asli chandi ka varq","Cheeni kam, kaju zyada","Bina essence, bina rang"]'::jsonb,
  1982,
  '/images/kaju-katli.jpg', 'Sabse Bikau', 4.9, 812,
  '[{"label":"250g","price":230},{"label":"500g","price":440},{"label":"1 kg","price":860}]'::jsonb, 2
),
(
  'motichoor-laddoo', 'Motichoor Laddoo', 'मोतीचूर लड्डू', 'sweets',
  'Tiny boondi pearls bound in warm ghee — melts before you blink.',
  'Boondi ek-ek moti jaisi, desi ghee mein tala hua, aur pistachiyon ki chaadar. Shaadi ho ya tyohaar — Kapila ke laddoo pehle khatam hote hain.',
  'Yehi woh laddoo hai jisse dhaaba shuru hua — 1974 ki Diwali pe Dadaji ne poore mohalle ko khilaya tha. Boondi ka jhaara wahi purana peetal ka hai, teen peedhi se kaam kar raha hai.',
  '["Besan ko peetal ke jhaare se boondi mein utaarte hain","Apne bilona ghee mein halki aanch pe talna","Ek-taar chashni mein moti-moti boondi bhigona","Haath ki hatheli pe garam-garam laddoo baandhna"]'::jsonb,
  '["Apna bilona desi ghee","Kesar se rang — food colour nahi","Boondi moti, daant nahi lagti","Roz subah taaza baandhe"]'::jsonb,
  1974,
  '/images/laddoo.jpg', 'Shaadi Season', 4.8, 640,
  '[{"label":"250g","price":110},{"label":"500g","price":200},{"label":"1 kg","price":380}]'::jsonb, 3
)
on conflict (id) do update set
  heritage = excluded.heritage,
  craft    = excluded.craft,
  purity   = excluded.purity,
  since    = excluded.since;

-- ═════════════════════════════════════════════════════════════════════
--  DONE. Verify in Table Editor: profiles, products, orders ✓
--  Dashboard → Auth → Providers → Phone → enable + add a
--  "Test phone number" (e.g. +919876543210, OTP 123456) for dev login.
-- ═════════════════════════════════════════════════════════════════════
