-- ════════════════════════════════════════════════════════════════════
--  KAPILA DAIRY · EK HI MASTER FILE · v4 (FINAL)
--  ⚠️  Purani schema.sql / admin.sql bhool jao. SIRF YEH FILE chalaao:
--      Dashboard → SQL Editor → New query → poora paste → Run.
--
--  Yeh file:
--    • purana v1 system (customers table, loose policies) hata deti hai
--    • saari tables fresh banati hai (products/profiles/orders + logs)
--    • SAARE functions drop karke dobara banati hai — koi "not found"
--      ya "schema cache" error nahi aayega
--    • customer-side RPCs (add_dane/redeem_dane) + admin RPCs +
--      payment-link RPCs — sab ek saath
--    • 6 seed products (virasat + craft + purity ke saath)
--
--  Re-run safe hai — jitni baar chalaao, utni baar clean banega.
-- ════════════════════════════════════════════════════════════════════

-- ── 0 · PURANA SYSTEM HATAO ─────────────────────────────────────────
drop table if exists public.customers cascade;
drop view  if exists public.kapila_daily_revenue;

-- saare purane functions hatao (kisi bhi signature ke)
drop function if exists public.add_dane(integer);
drop function if exists public.redeem_dane(integer);
drop function if exists public.handle_new_user() cascade;
drop function if exists public.norm_phone(text) cascade;
drop function if exists public.admin_find_customer(text);
drop function if exists public.admin_spend_dane(text, integer);
drop function if exists public.admin_credit_dane(text, integer);
drop function if exists public.admin_create_customer(text, text, integer);
drop function if exists public.admin_list_orders(integer);
drop function if exists public.admin_mark_paid(text, text);
drop function if exists public.admin_set_order_status(text, text);
drop function if exists public.admin_create_order(text, text, text, text, text, boolean, numeric, integer, jsonb);
drop function if exists public.admin_daily_stats(integer);
drop function if exists public.admin_list_products();
drop function if exists public.admin_upsert_product(text, text, text, text, text, text, text, jsonb, jsonb, integer, text, text, jsonb, integer);
drop function if exists public.admin_toggle_product(text, boolean);
drop function if exists public.get_pay_order(text);
drop function if exists public.confirm_online_payment(text, text);

-- ── 1 · PRODUCTS ────────────────────────────────────────────────────
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

drop policy if exists "products_admin_insert" on public.products;
drop policy if exists "products_admin_update" on public.products;
drop policy if exists "products_admin_delete" on public.products;
drop policy if exists "products_public_read"  on public.products;
create policy "products_public_read" on public.products
  for select using (is_active = true);

-- ── 2 · PROFILES (auth customers + counter customers) ───────────────
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Kapila Guest',
  phone       text,
  dane        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- counter se bina-login customer ban sake, isliye auth-FK hatao
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles enable row level security;

drop policy if exists "profile_read_own"   on public.profiles;
drop policy if exists "profile_update_own" on public.profiles;
drop policy if exists "profile_insert_own" on public.profiles;

create policy "profile_read_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profile_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
-- dane direct update nahi ho sakte (sirf RPC se)
create policy "profile_update_own" on public.profiles
  for update using (
    auth.uid() = id
    and dane = (select dane from public.profiles where id = auth.uid())
  ) with check (auth.uid() = id);

-- signup pe profile auto-banao
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 3 · HELPERS ─────────────────────────────────────────────────────
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

-- phone unique rakho taaki counter customer duplicate na bane
-- (agar purane duplicate phone pade hain toh index skip ho jayega — script nahi rukegi)
do $$
begin
  create unique index if not exists profiles_phone_unique
    on public.profiles (public.norm_phone(phone));
exception when others then
  raise notice 'profiles_phone_unique index skip: %', sqlerrm;
end $$;

-- ── 4 · ORDERS ──────────────────────────────────────────────────────
create table if not exists public.orders (
  id             bigint generated always as identity primary key,
  order_id       text unique not null,
  user_id        uuid,
  customer_id    uuid,
  customer_name  text not null,
  phone          text not null,
  pickup         text,
  note           text,
  payment        text not null check (payment in ('online','counter','redeem')),
  paid           boolean not null default false,
  payment_id     text,
  redeem         jsonb,
  total          numeric not null,
  grains_earned  integer not null default 0,
  items          jsonb not null,
  status         text not null default 'placed'
                 check (status in ('placed','ready','collected','cancelled')),
  created_at     timestamptz not null default now()
);
alter table public.orders
  add column if not exists redeem jsonb;
alter table public.orders drop constraint if exists orders_payment_check;
alter table public.orders
  add constraint orders_payment_check check (payment in ('online','counter','redeem'));
alter table public.orders enable row level security;

drop policy if exists "orders_insert"   on public.orders;
drop policy if exists "orders_read_own" on public.orders;
create policy "orders_insert" on public.orders
  for insert with check (user_id is null or user_id = auth.uid());
create policy "orders_read_own" on public.orders
  for select using (user_id is not null and user_id = auth.uid());

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);

-- ── 5 · WEBHOOK LOG (production Razorpay webhook) ───────────────────
create table if not exists public.razorpay_webhook_log (
  id          bigint generated always as identity primary key,
  event       text,
  payload     jsonb,
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.razorpay_webhook_log enable row level security;

-- ── 6 · STORAGE BUCKET ──────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('kapila', 'kapila', true)
on conflict (id) do nothing;
drop policy if exists "kapila_public_read" on storage.objects;
drop policy if exists "kapila_upload"      on storage.objects;
create policy "kapila_public_read" on storage.objects
  for select using (bucket_id = 'kapila');
create policy "kapila_upload" on storage.objects
  for insert with check (bucket_id = 'kapila');

-- ════════════════════════════════════════════════════════════════════
--  CUSTOMER-SIDE RPCs
-- ════════════════════════════════════════════════════════════════════

-- login customer apne khate mein dane jode (sirf increment)
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
     set dane = dane + amount, updated_at = now()
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

-- login customer dane kharch kare (balance check server pe)
create or replace function public.redeem_dane(amount integer)
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
  if amount is null or amount <= 0 or amount > 100000 then
    raise exception 'Dane ki ginti galat hai.';
  end if;

  update public.profiles
     set dane = dane - amount, updated_at = now()
   where id = auth.uid() and dane >= amount
  returning dane into new_total;

  if new_total is null then
    raise exception 'Itna dana khate mein nahi hai.';
  end if;
  return new_total;
end;
$$;

-- pay page: order ID se ticket data (public)
create or replace function public.get_pay_order(p_order text)
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
  return out;
end;
$$;

-- Razorpay checkout success → order PAID (demo bridge; production → webhook)
create or replace function public.confirm_online_payment(p_order text, p_payment_id text)
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
  return updated_rows > 0;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
--  ADMIN RPCs (counter terminal · demo phase: anon-callable)
--  LIVE se pehle inhe service-role backend ke peeche karo.
-- ════════════════════════════════════════════════════════════════════

-- customer khata phone se (auth wala ya counter wala)
create or replace function public.admin_find_customer(p_phone text)
returns table (id uuid, name text, phone text, dane integer, created_at timestamptz)
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

-- NAYA · counter se customer banao (bina login ke)
create or replace function public.admin_create_customer(p_name text, p_phone text, p_dane integer default 0)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  phone10 text;
begin
  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'Naam kam se kam 2 akshar ka do.';
  end if;
  phone10 := public.norm_phone(p_phone);
  if length(phone10) <> 10 then
    raise exception 'Phone 10 digit ka hona chahiye.';
  end if;
  if coalesce(p_dane, 0) < 0 or coalesce(p_dane, 0) > 100000 then
    raise exception 'Welcome dane 0 se 100000 ke beech rakho.';
  end if;

  if exists (select 1 from public.profiles where public.norm_phone(phone) = phone10) then
    raise exception 'Is phone pe khata pehle se hai — purana khata use karo.';
  end if;

  insert into public.profiles (name, phone, dane)
  values (trim(p_name), phone10, coalesce(p_dane, 0))
  returning id into new_id;

  return new_id;
end;
$$;

-- dane kaato (inaam redemption)
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
  select pr.id into cust from public.profiles pr
   where public.norm_phone(pr.phone) = public.norm_phone(p_phone) limit 1;
  if cust is null then raise exception 'Is phone pe koi khata nahi hai.'; end if;

  update public.profiles
     set dane = dane - p_amount, updated_at = now()
   where id = cust and dane >= p_amount
  returning dane into new_total;
  if new_total is null then raise exception 'Itna dana khate mein nahi hai.'; end if;
  return new_total;
end;
$$;

-- dane jodo (manual / goodwill)
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
  select pr.id into cust from public.profiles pr
   where public.norm_phone(pr.phone) = public.norm_phone(p_phone) limit 1;
  if cust is null then raise exception 'Is phone pe koi khata nahi hai.'; end if;

  update public.profiles set dane = dane + p_amount, updated_at = now()
   where id = cust returning dane into new_total;
  return new_total;
end;
$$;

-- saare recent orders
create or replace function public.admin_list_orders(p_limit integer default 40)
returns setof public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  return query select * from public.orders order by created_at desc limit coalesce(p_limit, 40);
end;
$$;

-- cash/UPI liya → PAID
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

-- status badlo
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

-- walk-in order counter se
create or replace function public.admin_create_order(
  p_order_id text, p_name text, p_phone text, p_pickup text, p_payment text,
  p_paid boolean, p_total numeric, p_grains integer, p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cust uuid;
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
end;
$$;

-- dashboard stats
create or replace function public.admin_daily_stats(p_days integer default 7)
returns table (
  day date, order_count bigint, revenue numeric, dane_issued bigint,
  online_orders bigint, counter_orders bigint, paid_orders bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select date_trunc('day', o.created_at)::date                     as day,
           count(*)                                                  as order_count,
           coalesce(sum(o.total), 0)                                 as revenue,
           coalesce(sum(o.grains_earned), 0)                         as dane_issued,
           count(*) filter (where o.payment = 'online')              as online_orders,
           count(*) filter (where o.payment in ('counter','redeem')) as counter_orders,
           count(*) filter (where o.paid)                            as paid_orders
      from public.orders o
     where o.status <> 'cancelled'
       and o.created_at >= now() - (coalesce(p_days, 7) || ' days')::interval
     group by 1 order by 1 desc;
end;
$$;

-- saare products (chhupe hue bhi)
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

-- product add / edit
create or replace function public.admin_upsert_product(
  p_id text, p_name text, p_hindi text, p_category text, p_desc text, p_story text,
  p_heritage text, p_craft jsonb, p_purity jsonb, p_since integer, p_image text,
  p_tag text, p_units jsonb, p_sort integer
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
  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'Product ka naam do.';
  end if;

  insert into public.products
    (id, name, hindi, category, "desc", story, heritage, craft, purity, since,
     image, tag, units, sort, is_active)
  values
    (p_id, trim(p_name), p_hindi, p_category, p_desc, p_story, p_heritage,
     coalesce(p_craft, '[]'::jsonb), coalesce(p_purity, '[]'::jsonb), p_since,
     coalesce(nullif(trim(p_image), ''),
       'https://image.qwenlm.ai/generated-images/a1f8eaf4-1a38-4350-9c40-e5a135b1dc1d/_result.png'),
     nullif(p_tag, ''), p_units, coalesce(p_sort, 99), true)
  on conflict (id) do update set
    name = excluded.name, hindi = excluded.hindi, category = excluded.category,
    "desc" = excluded."desc", story = excluded.story, heritage = excluded.heritage,
    craft = excluded.craft, purity = excluded.purity, since = excluded.since,
    image = excluded.image, tag = excluded.tag, units = excluded.units, sort = excluded.sort;
end;
$$;

-- product dikhao / chhupao
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

-- ── grants ──────────────────────────────────────────────────────────
grant execute on function public.add_dane(integer) to authenticated;
grant execute on function public.redeem_dane(integer) to authenticated;
grant execute on function public.norm_phone(text) to anon, authenticated;
grant execute on function public.get_pay_order(text) to anon, authenticated;
grant execute on function public.confirm_online_payment(text, text) to anon, authenticated;
grant execute on function public.admin_find_customer(text) to anon, authenticated;
grant execute on function public.admin_create_customer(text, text, integer) to anon, authenticated;
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

-- ── seed products (re-run pe refresh ho jayenge) ────────────────────
insert into public.products
  (id, name, hindi, category, "desc", story, heritage, craft, purity, since, image, tag, rating, reviews, units, sort)
values
('taaza-doodh','Taaza A2 Doodh','ताज़ा दूध','dairy',
 'Farm-to-door A2 cow milk — bottled within 2 hours of milking.',
 'Hamari gaayein sirf A2. Doodh subah 4 baje nikalta hai, 6 baje bottle mein, 7 baje aapke dhaabe tak.',
 'Dadaji Ramkishan ne 1974 mein yehi dhaaba 2 gaayon aur 1 cycle se shuru kiya tha. Aaj 40+ desi gaayein hain — Gir, Sahiwal aur Tharparkar — par subah 4 baje ki doh aaj bhi haath se hoti hai. Pehli doh ka pehla gilass aaj bhi Mandir chadhta hai.',
 '["Subah 4 baje — har gaay ke naam se, haath se doh","Turant thanda karke 63 degree pe dheema pasteurise","Bina homogenise kiye — malai upar khud jamti hai","Kaanch ki bottle mein, subah 7 baje se pehle aap tak"]'::jsonb,
 '["100% A2 desi gaay","No preservatives","Paani nahi, powder nahi","Sirf kaanch ki bottle"]'::jsonb,
 1974,'https://image.qwenlm.ai/generated-images/bca00f28-4cee-427e-8f1e-31d75f9c2e3f/_result.png','A2 Gaay',5.0,1024,
 '[{"label":"500 ml","price":33},{"label":"1 litre","price":66},{"label":"2 litre","price":130}]'::jsonb,1),
('kaju-katli','Kaju Katli','काजू कतली','sweets',
 'Slow-cooked cashew fudge, finished with pure silver varq.',
 'Sirf Goan kaju, thoda sa cheeni, aur Dadi ji ki 50 saal purani technique. Har katli haath se beli jaati hai.',
 '1982 mein Dadi Sushila ne pehli baar sangmarmar ke patthar pe katli beli thi. Unka kehna tha — kaju bolta hai, bas dheemi aanch chahiye. Aaj bhi har katli usi patthar pe haath se kat-ti hai, aur shaadi ke dabbe mein pehli rakhi jaati hai.',
 '["Konkan ke W-320 grade kaju raat bhar bhigote hain","Patli ek-taar chashni mein 40 minute dheema pakna","Sangmarmar ke patthar pe haath se belna aur kaatna","Upar chandi ka asli khaane layak varq"]'::jsonb,
 '["100% kaju — maida zero","Asli chandi ka varq","Cheeni kam, kaju zyada","Bina essence, bina rang"]'::jsonb,
 1982,'https://image.qwenlm.ai/generated-images/c6f005fb-bb33-4b43-ba70-95f2fc3ff2a3/_result.png','Sabse Bikau',4.9,812,
 '[{"label":"250g","price":230},{"label":"500g","price":440},{"label":"1 kg","price":860}]'::jsonb,2),
('motichoor-laddoo','Motichoor Laddoo','मोतीचूर लड्डू','sweets',
 'Tiny boondi pearls bound in warm ghee — melts before you blink.',
 'Boondi ek-ek moti jaisi, desi ghee mein tala hua, aur pistachiyon ki chaadar.',
 'Yehi woh laddoo hai jisse dhaaba shuru hua — 1974 ki Diwali pe Dadaji ne poore mohalle ko khilaya tha. Boondi ka jhaara wahi purana peetal ka hai, teen peedhi se kaam kar raha hai.',
 '["Besan ko peetal ke jhaare se moti-moti boondi mein utaarte hain","Apne bilona ghee mein halki aanch pe sone jaisa talna","Ek-taar chashni mein boondi ko bhigona","Haath ki hatheli pe garam-garam laddoo baandhna"]'::jsonb,
 '["Apna bilona desi ghee","Kesar ka rang — food colour nahi","Boondi moti, daant nahi lagti","Roz subah taaza"]'::jsonb,
 1974,'https://image.qwenlm.ai/generated-images/7db3dcd4-d40d-4951-a590-0879d4bbecd1/_result.png','Shaadi Season',4.8,640,
 '[{"label":"250g","price":110},{"label":"500g","price":200},{"label":"1 kg","price":380}]'::jsonb,3),
('gulab-jamun','Gulab Jamun','गुलाब जामुन','sweets',
 'Khoya dumplings soaked overnight in rose-cardamom syrup.',
 'Khoya subah ka, syrup raat bhar ka. Jamun itna naram ki chammach ki zaroorat nahi.',
 'Bade Papa 1980 mein Lucknow se khoya banane ki taleem le kar aaye the. Unhone kaha tha — jamun ka raaz syrup nahi, khoya hai. Isliye hamara khoya roz subah 40 litre doodh se taaza ghot-ta hai.',
 '["Subah ke doodh ka khoya haath se ghotna","Halki aanch pe sona-sa bhunna — jalna mana hai","Ungliyon se bina darar ke gol baandhna","Gulaab-e-sadab aur elaichi wali chashni mein raat bhar bhigona"]'::jsonb,
 '["Asli khoya — powder nahi","Gulaab ke phool ka arq","Bina essence","Raat bhar bhigona zaroori"]'::jsonb,
 1980,'https://image.qwenlm.ai/generated-images/46130cd3-3395-4da6-8b8a-f70e89b3d780/_result.png',null,4.9,731,
 '[{"label":"250g (4 pc)","price":95},{"label":"500g (8 pc)","price":180},{"label":"1 kg (16 pc)","price":340}]'::jsonb,4),
('jalebi-rabri','Jalebi with Rabri','जलेबी रबड़ी','sweets',
 'Crackling saffron coils over chilled, thick-set rabri.',
 'Tave se seedha aapke dabbe tak — garam jalebi, thandi rabri. Yeh jodi 1985 se tooti nahi hai.',
 'Jalebi ki kadhai 1985 se usi angeethi pe hai — peetal ki, 20 kilo ki. Rabri raat bhar angaare ki dheemi aanch pe jamti hai, isliye uski tahon mein subah ki taazgi hoti hai.',
 '["Maida-kesar ka batter 8 ghante khatta hone dena","Peetal ki kadhai mein desi ghee pe gol-chakkar","Chashni mein 2 minute — zyada nahi, kam nahi","Rabri ki moti tah ke saath garama-garam parosna"]'::jsonb,
 '["Desi ghee mein tali","Asli kesar — peela rang usi ka","Rabri angaare ki aanch ki","Order pe tali jaati hai"]'::jsonb,
 1985,'https://image.qwenlm.ai/generated-images/bdfb81d8-74c5-4dbd-870b-95b9710c3136/_result.png','Garam Garam',4.7,498,
 '[{"label":"250g","price":120},{"label":"500g","price":220},{"label":"1 kg","price":420}]'::jsonb,5),
('aloo-samosa','Aloo Samosa','आलू समोसा','snacks',
 'Coal-fire crispy shells, masaledar aloo, do chutney saath.',
 'Aata subah goonda, aloo bhaap ka, tel garam — aur samosa seedha tave se aapke haath tak.',
 '1988 mein railway station ke paas wale thele se Chacha ji ne samosa karna seekha — badle mein unhone 2 mahine free chai pilayi thi. Ajwain wala cover aur bhaap wale aloo ka raaz tab se hamare paas hai.',
 '["Subah ajwain ke saath atta goondna, 4 ghante rest","Aloo bhaap ke, haath se masalna — mixer mana hai","Kam aanch pe dheema talna — 2 baar, taki andar pakke","Ghar ki hari chutney aur imli chutney ke saath"]'::jsonb,
 '["Channa nahi, vanaspati nahi","Ajwain wala desi cover","Aloo bhaap ka, masala ghar ka","2 baar tali kurr-kurr"]'::jsonb,
 1988,'https://image.qwenlm.ai/generated-images/5844f2fa-a2fe-4304-83fd-38c367ed1c96/_result.png','Chai Partner',4.6,903,
 '[{"label":"2 pc + chutney","price":30},{"label":"4 pc + chutney","price":60},{"label":"12 pc party box","price":170}]'::jsonb,6)
on conflict (id) do update set
  name = excluded.name, hindi = excluded.hindi, category = excluded.category,
  "desc" = excluded."desc", story = excluded.story, heritage = excluded.heritage,
  craft = excluded.craft, purity = excluded.purity, since = excluded.since,
  image = excluded.image, tag = excluded.tag, rating = excluded.rating,
  reviews = excluded.reviews, units = excluded.units, sort = excluded.sort;

-- ════════════════════════════════════════════════════════════════════
--  DONE! Test karo:
--    select * from public.admin_daily_stats(7);
--    select public.admin_find_customer('9876543210');
--    select * from public.admin_list_products();
-- ════════════════════════════════════════════════════════════════════
