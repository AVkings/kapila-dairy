-- ════════════════════════════════════════════════════════════════════
--  KAPILA DAIRY · Supabase schema v2 · CLEAN INSTALL
--  ⚠️  STEP 0 purana system (v1 tables + loose demo policies) hata deta hai
--  Run: Dashboard → SQL Editor → New query → paste ALL → Run
--  Safe to re-run (idempotent).
-- ════════════════════════════════════════════════════════════════════

-- ── STEP 0 · PURANA SYSTEM HATAO ────────────────────────────────────
-- 0a. v1 loyalty table (ab profiles use hoti hai, auth se judi hui)
drop table if exists public.customers cascade;

-- 0b. purani orders table (naye columns user_id/customer_id ke saath banegi)
drop table if exists public.orders cascade;

-- 0c. purane views, functions, triggers
drop view     if exists public.kapila_daily_revenue;
drop function if exists public.add_dane(integer);
drop trigger  if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 0d. products pe loose demo write-policies hatao
--     (admin panel ab service-role key se likhega — zyada secure)
drop policy if exists "products_admin_insert" on public.products;
drop policy if exists "products_admin_update" on public.products;
drop policy if exists "products_admin_delete" on public.products;
drop policy if exists "products_public_read"  on public.products;

-- ── STEP 1 · PRODUCTS (catalogue — app sirf padh sakti hai) ─────────
create table if not exists public.products (
  id          text primary key,
  name        text not null,
  hindi       text,
  category    text not null check (category in ('sweets','dairy','snacks','drinks')),
  "desc"      text,
  story       text,
  heritage    text,            -- virasat: three-generation story
  craft       jsonb,           -- "kaise banti hai" steps: ["..",".."]
  purity      jsonb,           -- "shuddhta ka vaada" badges: ["..",".."]
  since       integer,         -- recipe ka saal, e.g. 1974
  image       text not null,
  tag         text,
  rating      numeric not null default 4.6,
  reviews     integer not null default 0,
  units       jsonb not null,  -- [{"label":"250g","price":230}, ...]
  sort        integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- agar table pehle se hai toh naye columns add karo
alter table public.products
  add column if not exists heritage text,
  add column if not exists craft    jsonb,
  add column if not exists purity   jsonb,
  add column if not exists since    integer;

alter table public.products enable row level security;

create policy "products_public_read" on public.products
  for select using (is_active = true);
-- ⚠️  products mein insert/update/delete sirf admin karega
--     service-role key se (admin counter panel) — koi policy nahi chahiye.

-- ── STEP 2 · PROFILES (signup pe auto-banti hai) ────────────────────
--  auth.users se 1:1 judi — naam, phone, aur sakhar ke DANE yahin rehte hain
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default 'Kapila Guest',
  phone       text,
  dane        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- sirf apni row padho
create policy "profile_read_own" on public.profiles
  for select using (auth.uid() = id);

-- apni row update karo — lekin DANE badalna mana (sirf add_dane() se)
create policy "profile_update_own" on public.profiles
  for update using (
    auth.uid() = id
    and dane = (select dane from public.profiles where id = auth.uid())
  ) with check (auth.uid() = id);

create policy "profile_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- trigger: naya user signup karte hi profile row auto-banao
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
    coalesce(new.raw_user_meta_data->>'name', 'Kapila Guest'),
    coalesce(new.phone, new.raw_user_meta_data->>'phone')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── STEP 3 · ADD_DANE (secure loyalty increment — RPC) ──────────────
--  client dane set NAHI kar sakta — sirf apne khate mein jod sakta hai
create or replace function public.add_dane(amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  if auth.uid() is null then
    raise exception 'Login zaroori hai — khata pehle kholo.';
  end if;
  if amount is null or amount < 0 or amount > 100000 then
    raise exception 'Dane ki ginti galat hai.';
  end if;

  update public.profiles
     set dane = dane + amount,
         updated_at = now()
   where id = auth.uid()
  returning dane into new_total;

  if new_total is null then
    insert into public.profiles (id, dane)
    values (auth.uid(), amount)
    returning dane into new_total;
  end if;

  return new_total;
end;
$$;

revoke execute on function public.add_dane(integer) from public;
grant  execute on function public.add_dane(integer) to authenticated;

-- ── STEP 4 · ORDERS (auth-linked, counter QR ke liye) ───────────────
create table if not exists public.orders (
  id             bigint generated always as identity primary key,
  order_id       text unique not null,
  user_id        uuid references auth.users(id),        -- guest = NULL
  customer_id    uuid references public.profiles(id),   -- guest = NULL
  customer_name  text not null,
  phone          text not null,
  pickup         text,
  note           text,
  payment        text not null check (payment in ('online','counter')),
  paid           boolean not null default false,
  payment_id     text,                                  -- razorpay payment id
  total          numeric not null,
  grains_earned  integer not null default 0,
  items          jsonb not null,                        -- [{id,name,pack,qty,price}]
  status         text not null default 'placed'
                 check (status in ('placed','ready','collected','cancelled')),
  created_at     timestamptz not null default now()
);

alter table public.orders enable row level security;

-- guest bhi order daal sakta hai (login optional) — lekin jhootha user_id nahi
create policy "orders_insert" on public.orders
  for insert with check (
    user_id is null or user_id = auth.uid()
  );

-- logged-in customer sirf APNE orders padh sakta hai
-- (guest orders counter QR scan se milte hain — admin service-role se padhega)
create policy "orders_read_own" on public.orders
  for select using (user_id is not null and user_id = auth.uid());

-- ⚠️  status/paid update sirf admin karega service-role key se.
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);

-- ── STEP 5 · REVENUE VIEW (admin dashboard ke liye) ─────────────────
create or replace view public.kapila_daily_revenue as
select
  date_trunc('day', created_at)::date         as day,
  count(*)                                    as order_count,
  coalesce(sum(total), 0)                     as revenue,
  coalesce(sum(grains_earned), 0)             as dane_issued,
  count(*) filter (where payment = 'online')  as online_orders,
  count(*) filter (where payment = 'counter') as counter_orders,
  count(*) filter (where paid)                as paid_orders
from public.orders
where status <> 'cancelled'
group by 1
order by 1 desc;

-- ── STEP 6 · STORAGE (product photos ke liye bucket) ────────────────
insert into storage.buckets (id, name, public)
values ('kapila', 'kapila', true)
on conflict (id) do nothing;

drop policy if exists "kapila_public_read" on storage.objects;
drop policy if exists "kapila_upload"      on storage.objects;

create policy "kapila_public_read" on storage.objects
  for select using (bucket_id = 'kapila');
create policy "kapila_upload" on storage.objects
  for insert with check (bucket_id = 'kapila');
-- ⚠️  upload policy bhi admin panel ke time service-role pe shift hogi

-- ── STEP 7 · SEED DATA (virasat + craft + purity ke saath) ──────────
--  re-run pe update ho jayega, duplicate nahi banega
insert into public.products
  (id, name, hindi, category, "desc", story, heritage, craft, purity, since,
   image, tag, rating, reviews, units, sort)
values
(
  'taaza-doodh', 'Taaza A2 Doodh', 'ताज़ा दूध', 'dairy',
  'Farm-to-door A2 cow milk — bottled within 2 hours of milking.',
  'Hamari gaayein sirf A2. Doodh subah 4 baje nikalta hai, 6 baje bottle mein, 7 baje aapke dhaabe tak.',
  'Dadaji Ramkishan ne 1974 mein yehi dhaaba 2 gaayon aur 1 cycle se shuru kiya tha. Aaj 40+ desi gaayein hain — Gir, Sahiwal aur Tharparkar — par subah 4 baje ki doh aaj bhi haath se hoti hai. Pehli doh ka pehla gilass aaj bhi Mandir chadhta hai.',
  '["Subah 4 baje — har gaay ke naam se, haath se doh","Turant thanda karke 63°C pe dheema pasteurise","Bina homogenise kiye — malai upar khud jamti hai","Kaanch ki bottle mein, subah 7 baje se pehle aap tak"]'::jsonb,
  '["100% A2 desi gaay","No preservatives","Paani nahi, powder nahi","Sirf kaanch ki bottle"]'::jsonb,
  1974,
  'https://image.qwenlm.ai/generated-images/bca00f28-4cee-427e-8f1e-31d75f9c2e3f/_result.png',
  'A2 Gaay', 5.0, 1024,
  '[{"label":"500 ml","price":33},{"label":"1 litre","price":66},{"label":"2 litre","price":130}]'::jsonb, 1
),
(
  'kaju-katli', 'Kaju Katli', 'काजू कतली', 'sweets',
  'Slow-cooked cashew fudge, finished with pure silver varq.',
  'Sirf Goan kaju, thoda sa cheeni, aur Dadi ji ki 50 saal purani technique. Har katli haath se belii jaati hai.',
  '1982 mein Dadi Sushila ne pehli baar kaanch ke patthar pe katli beli thi. Unka kehna tha — kaju bolta hai, bas dheemi aanch chahiye. Aaj bhi har katli usi sang-e-marmar pe haath se kat-ti hai, aur shaadi ke dabbe mein pehli rakhi jaati hai.',
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
  'Yehi woh laddoo hai jisse dhaaba shuru hua — 1974 ki Diwali pe Dadaji ne poore mohalle ko khilaya tha. Boondi ka jhaara wahi purana peetal ka hai, teen peedhi se kaam kar raha hai aur aaj bhi roz subah garam-garam baandha jaata hai.',
  '["Besan ko peetal ke jhaare se moti-moti boondi mein utaarte hain","Apne bilona ghee mein halki aanch pe sone jaisa talna","Ek-taar chashni mein boondi ko bhigona","Haath ki hatheli pe garam-garam laddoo baandhna"]'::jsonb,
  '["Apna bilona desi ghee","Kesar ka rang — food colour nahi","Boondi moti, daant nahi lagti","Roz subah taaza"]'::jsonb,
  1974,
  'https://image.qwenlm.ai/generated-images/7db3dcd4-d40d-4951-a590-0879d4bbecd1/_result.png',
  'Shaadi Season', 4.8, 640,
  '[{"label":"250g","price":110},{"label":"500g","price":200},{"label":"1 kg","price":380}]'::jsonb, 3
)
on conflict (id) do update set
  heritage = excluded.heritage,
  craft    = excluded.craft,
  purity   = excluded.purity,
  since    = excluded.since,
  name     = excluded.name,
  hindi    = excluded.hindi,
  "desc"   = excluded."desc",
  story    = excluded.story,
  units    = excluded.units;

-- ════════════════════════════════════════════════════════════════════
--  BAS! Ab dashboard mein yeh karna:
--  1. Authentication → Providers → Phone → ENABLE
--     → "Test Phone Numbers" mein +919876543210 add karo (OTP: 123456)
--  2. Authentication → Settings → Email → (demo ke liye) "Confirm email" OFF
--  3. App refresh karo → Login → OTP aayega → dane khata chalu!
-- ════════════════════════════════════════════════════════════════════
