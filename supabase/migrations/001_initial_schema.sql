-- ═══════════════════════════════════════════════════════════════════════════
--  DNYANAM · Phase 1 schema
--  OTT-style bookstore for physical books, e-books and magazines.
--
--  Run this whole file in the Supabase SQL editor, or with:
--      supabase db push
--
--  This file is generated from supabase/migrations/_base.sql + data/*.json.
--  Regenerate seeds with:  npm run db:generate
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. CATALOG CONTENT LANGUAGES
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.languages (
  code          text primary key,
  name_mr       text not null,
  name_hi       text not null,
  name_en       text not null,
  name_native   text not null,
  is_active     boolean not null default true,
  sort_order    integer not null default 0
);

create index if not exists languages_active_sort_idx
  on public.languages (is_active, sort_order);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. PROFILES (extends auth.users)
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                        uuid primary key references auth.users (id) on delete cascade,
  full_name                 text,
  phone                     text,
  role                      text not null default 'customer'
                              check (role in ('customer', 'admin')),
  ui_language               text not null default 'mr'
                              check (ui_language in ('mr', 'hi', 'en')),
  preferred_content_language text references public.languages (code) default 'mr',
  created_at                timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. UNIFIED CATALOG (physical books, e-books, digital & print magazines)
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.catalog_items (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,
  title_en              text,
  slug                  text unique not null,
  subtitle_or_edition   text,
  author_or_publisher   text not null,
  description           text,
  item_type             text not null
                          check (item_type in ('physical_book', 'ebook', 'magazine_digital', 'magazine_print')),
  language_code         text not null references public.languages (code),
  category              text not null,
  isbn_or_issn          text,
  price_paise           integer not null check (price_paise >= 0),
  mrp_paise             integer not null check (mrp_paise >= 0),
  cover_image_url       text not null,
  sample_pdf_url        text,
  digital_file_path     text,
  stock_quantity        integer not null default 0 check (stock_quantity >= 0),
  is_trending           boolean not null default false,
  is_latest_arrival     boolean not null default false,
  is_hero_featured      boolean not null default false,
  is_published          boolean not null default true,
  created_at            timestamptz not null default now(),
  constraint catalog_physical_requires_stock
    check (item_type not in ('physical_book', 'magazine_print') or digital_file_path is null)
);

create index if not exists catalog_trending_idx
  on public.catalog_items (is_published, is_trending, created_at desc);
create index if not exists catalog_latest_idx
  on public.catalog_items (is_published, is_latest_arrival, created_at desc);
create index if not exists catalog_language_idx
  on public.catalog_items (language_code);
create index if not exists catalog_type_idx
  on public.catalog_items (item_type);
create index if not exists catalog_category_idx
  on public.catalog_items (category);
create index if not exists catalog_created_idx
  on public.catalog_items (created_at desc);
create index if not exists catalog_title_trgm_idx
  on public.catalog_items using gin (title gin_trgm_ops);
create index if not exists catalog_title_en_trgm_idx
  on public.catalog_items using gin (title_en gin_trgm_ops);
create index if not exists catalog_author_trgm_idx
  on public.catalog_items using gin (author_or_publisher gin_trgm_ops);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. AD BANNERS
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.ad_banners (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  slot_position       text not null
                        check (slot_position in ('hero_carousel', 'mid_feed_1', 'mid_feed_2')),
  desktop_image_url   text not null,
  mobile_image_url    text not null,
  target_url          text not null,
  language_code       text references public.languages (code),
  starts_at           timestamptz not null default now(),
  ends_at             timestamptz,
  is_active           boolean not null default true,
  priority            integer not null default 0
);

create index if not exists ad_banners_slot_idx
  on public.ad_banners (slot_position, is_active, priority desc);
create index if not exists ad_banners_window_idx
  on public.ad_banners (starts_at, ends_at);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. ORDERS
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete restrict,
  razorpay_order_id    text unique not null,
  razorpay_payment_id  text unique,
  status               text not null default 'created'
                         check (status in ('created', 'paid', 'failed', 'refunded')),
  subtotal_paise       integer not null check (subtotal_paise >= 0),
  shipping_paise       integer not null default 0 check (shipping_paise >= 0),
  total_paise          integer not null check (total_paise >= 0),
  shipping_address     jsonb,
  created_at           timestamptz not null default now(),
  paid_at              timestamptz
);

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status);

-- ───────────────────────────────────────────────────────────────────────────
-- 6. ORDER ITEMS
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders (id) on delete cascade,
  catalog_item_id    uuid not null references public.catalog_items (id) on delete restrict,
  quantity           integer not null default 1 check (quantity > 0),
  unit_price_paise   integer not null check (unit_price_paise >= 0)
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_catalog_idx on public.order_items (catalog_item_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 7. USER LIBRARY (unlocked digital assets)
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.user_library (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  catalog_item_id    uuid not null references public.catalog_items (id) on delete cascade,
  order_id           uuid not null references public.orders (id) on delete cascade,
  unlocked_at        timestamptz not null default now(),
  unique (user_id, catalog_item_id)
);

create index if not exists user_library_user_idx
  on public.user_library (user_id, unlocked_at desc);

-- ───────────────────────────────────────────────────────────────────────────
-- 8. WEBHOOK IDEMPOTENCY LEDGER
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.webhook_events (
  event_id      text primary key,
  event_type    text not null,
  processed_at  timestamptz not null default now()
);

create index if not exists webhook_events_processed_idx
  on public.webhook_events (processed_at desc);

-- ───────────────────────────────────────────────────────────────────────────
-- 9. HELPERS
-- ───────────────────────────────────────────────────────────────────────────

-- Admin check. SECURITY DEFINER so it can read profiles without recursing
-- through profiles' RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Auto-create a profile for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, phone, ui_language, preferred_content_language
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    'mr',
    'mr'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent customers from promoting themselves via the profiles UPDATE policy.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service-role writes (auth.uid() is null) are trusted
  if auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only administrators can change profile roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Atomic stock decrement used by paid-order fulfilment.
create or replace function public.decrement_catalog_stock(p_item_id uuid, p_qty integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.catalog_items
  set stock_quantity = greatest(0, stock_quantity - greatest(1, p_qty))
  where id = p_item_id
    and item_type in ('physical_book', 'magazine_print');
$$;

revoke all on function public.decrement_catalog_stock(uuid, integer) from public;
revoke all on function public.decrement_catalog_stock(uuid, integer) from anon, authenticated;
grant execute on function public.decrement_catalog_stock(uuid, integer) to service_role;

-- Atomic, idempotent paid-order fulfilment.
-- Locks the order row, unlocks digital items, decrements physical stock and
-- marks the order paid in a single transaction. Safe to call repeatedly:
-- returns false when the order was already fulfilled.
create or replace function public.fulfill_paid_order(
  p_razorpay_order_id text,
  p_razorpay_payment_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders
  where razorpay_order_id = p_razorpay_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.status = 'paid' then
    return false;
  end if;

  insert into public.user_library (user_id, catalog_item_id, order_id)
  select v_order.user_id, oi.catalog_item_id, v_order.id
  from public.order_items oi
  join public.catalog_items ci on ci.id = oi.catalog_item_id
  where oi.order_id = v_order.id
    and ci.item_type in ('ebook', 'magazine_digital')
  on conflict (user_id, catalog_item_id) do nothing;

  update public.catalog_items ci
  set stock_quantity = greatest(0, ci.stock_quantity - oi.quantity)
  from public.order_items oi
  where oi.order_id = v_order.id
    and ci.id = oi.catalog_item_id
    and ci.item_type in ('physical_book', 'magazine_print');

  update public.orders
  set status = 'paid',
      razorpay_payment_id = coalesce(p_razorpay_payment_id, razorpay_payment_id),
      paid_at = now()
  where id = v_order.id;

  return true;
end;
$$;

revoke all on function public.fulfill_paid_order(text, text) from public;
revoke all on function public.fulfill_paid_order(text, text) from anon, authenticated;
grant execute on function public.fulfill_paid_order(text, text) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────────────────
alter table public.languages       enable row level security;
alter table public.profiles        enable row level security;
alter table public.catalog_items   enable row level security;
alter table public.ad_banners      enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.user_library    enable row level security;
alter table public.webhook_events  enable row level security;

-- languages: public read of active languages, admin manage
drop policy if exists "languages_public_read" on public.languages;
create policy "languages_public_read" on public.languages
  for select using (is_active);

drop policy if exists "languages_admin_all" on public.languages;
create policy "languages_admin_all" on public.languages
  for all using (public.is_admin()) with check (public.is_admin());

-- profiles: own row (or admin), own insert/update, admin manage
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- catalog: public read of published rows, admin manage
drop policy if exists "catalog_public_read" on public.catalog_items;
create policy "catalog_public_read" on public.catalog_items
  for select using (is_published or public.is_admin());

drop policy if exists "catalog_admin_all" on public.catalog_items;
create policy "catalog_admin_all" on public.catalog_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ad banners: public read of currently active banners, admin manage
drop policy if exists "banners_public_read" on public.ad_banners;
create policy "banners_public_read" on public.ad_banners
  for select using (
    public.is_admin()
    or (
      is_active
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
    )
  );

drop policy if exists "banners_admin_all" on public.ad_banners;
create policy "banners_admin_all" on public.ad_banners
  for all using (public.is_admin()) with check (public.is_admin());

-- orders: own rows only, admin read/manage
drop policy if exists "orders_self_read" on public.orders;
create policy "orders_self_read" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders_self_insert" on public.orders;
create policy "orders_self_insert" on public.orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

-- order_items: visible only through an owned order
drop policy if exists "order_items_self_read" on public.order_items;
create policy "order_items_self_read" on public.order_items
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "order_items_self_insert" on public.order_items;
create policy "order_items_self_insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- user_library: read own unlocked items only. Inserts happen exclusively
-- through the service-role fulfilment path after a verified payment.
drop policy if exists "library_self_read" on public.user_library;
create policy "library_self_read" on public.user_library
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "library_admin_all" on public.user_library;
create policy "library_admin_all" on public.user_library
  for all using (public.is_admin()) with check (public.is_admin());

-- webhook_events: no client policies. Service role only.

-- ───────────────────────────────────────────────────────────────────────────
-- 11. STORAGE BUCKETS & POLICIES
--     covers  : public
--     samples : public
--     digital_assets : PRIVATE — signed URLs only, issued by the server
-- ───────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('covers', 'covers', true, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']),
  ('samples', 'samples', true, 26214400,
    array['application/pdf']),
  ('digital_assets', 'digital_assets', false, 262144000,
    array['application/pdf', 'application/epub+zip'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "covers_samples_public_read" on storage.objects;
create policy "covers_samples_public_read" on storage.objects
  for select using (bucket_id in ('covers', 'samples'));

drop policy if exists "digital_assets_admin_read" on storage.objects;
create policy "digital_assets_admin_read" on storage.objects
  for select using (bucket_id = 'digital_assets' and public.is_admin());

drop policy if exists "media_admin_insert" on storage.objects;
create policy "media_admin_insert" on storage.objects
  for insert with check (
    bucket_id in ('covers', 'samples', 'digital_assets')
    and public.is_admin()
  );

drop policy if exists "media_admin_update" on storage.objects;
create policy "media_admin_update" on storage.objects
  for update using (
    bucket_id in ('covers', 'samples', 'digital_assets')
    and public.is_admin()
  ) with check (
    bucket_id in ('covers', 'samples', 'digital_assets')
    and public.is_admin()
  );

drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_admin_delete" on storage.objects
  for delete using (
    bucket_id in ('covers', 'samples', 'digital_assets')
    and public.is_admin()
  );

-- ───────────────────────────────────────────────────────────────────────────
-- 12. SEED DATA
-- ───────────────────────────────────────────────────────────────────────────

-- Content languages (Marathi, Hindi, English first; then the rest)
insert into public.languages
  (code, name_mr, name_hi, name_en, name_native, is_active, sort_order)
values
  ('mr', 'मराठी', 'मराठी', 'Marathi', 'मराठी', true, 1),
  ('hi', 'हिंदी', 'हिन्दी', 'Hindi', 'हिन्दी', true, 2),
  ('en', 'इंग्रजी', 'अंग्रेज़ी', 'English', 'English', true, 3),
  ('ta', 'तमिळ', 'तमिल', 'Tamil', 'தமிழ்', true, 4),
  ('te', 'तेलुगू', 'तेलुगु', 'Telugu', 'తెలుగు', true, 5),
  ('bn', 'बंगाली', 'बंगाली', 'Bengali', 'বাংলা', true, 6),
  ('gu', 'गुजराती', 'गुजराती', 'Gujarati', 'ગુજરાતી', true, 7),
  ('kn', 'कन्नड', 'कन्नड़', 'Kannada', 'ಕನ್ನಡ', true, 8),
  ('ml', 'मल्याळम', 'मलयालम', 'Malayalam', 'മലയാളം', true, 9),
  ('pa', 'पंजाबी', 'पंजाबी', 'Punjabi', 'ਪੰਜਾਬੀ', true, 10),
  ('or', 'ओडिया', 'ओड़िया', 'Odia', 'ଓଡ଼ିଆ', true, 11)
on conflict (code) do update set
  name_mr = excluded.name_mr,
  name_hi = excluded.name_hi,
  name_en = excluded.name_en,
  name_native = excluded.name_native,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

-- Catalog — 36 richly varied titles across 11 Indian languages
insert into public.catalog_items
  (id, title, title_en, slug, subtitle_or_edition, author_or_publisher, description,
   item_type, language_code, category, isbn_or_issn, price_paise, mrp_paise,
   cover_image_url, sample_pdf_url, digital_file_path, stock_quantity,
   is_trending, is_latest_arrival, is_hero_featured, is_published, created_at)
values
  ('a1000000-0000-4000-8000-000000000001', 'मृत्युंजय', 'Mrityunjay', 'mrityunjay', 'कर्णाची अमर कथा · महाकाव्य', 'शिवाजी सावंत', 'महाभारतातील कर्णाच्या जीवनाचा मनस्वी वेध घेणारी अमर कादंबरी. शिवाजी सावंत यांनी कर्णाच्या अंतर्मनाचे दर्शन घडवत मराठी कादंबरीचा नवा मानदंड उभा केला. प्रत्येक वाचकाच्या मनात कायम राहणारे पुस्तक.', 'physical_book', 'mr', 'fiction', '9788177664372', 39900, 49900, '/covers/mrityunjay.svg', NULL, NULL, 48, true, false, true, true, '2026-09-18T09:15:00+00:00'),
  ('a1000000-0000-4000-8000-000000000002', 'श्यामची आई', 'Shyamchi Aai', 'shyamchi-aai', 'मातृप्रेमाचा अजरामर ग्रंथ', 'साने गुरुजी', 'आईच्या निःस्वार्थ प्रेमाचे आणि त्यातून घडलेल्या मूल्यशिक्षणाचे उदात्त दर्शन. साने गुरुजींच्या या आत्मकथनात्मक कादंबरीने पिढ्यानपिढ्या वाचकांच्या मनावर अधिराज्य गाजवले आहे.', 'physical_book', 'mr', 'fiction', '9788177661029', 19900, 25000, '/covers/shyamchi-aai.svg', NULL, NULL, 80, false, false, false, true, '2026-08-02T06:30:00+00:00'),
  ('a1000000-0000-4000-8000-000000000003', 'कोसला', 'Kosla', 'kosla', 'भाऊ पाध्ये यांची महाकाय कादंबरी', 'भाऊ पाध्ये', 'ग्रामीण महाराष्ट्रातील जातीय वास्तव, सत्तासंघर्ष आणि माणसाच्या अंतरंगाचा ढवळून काढणारा अभ्यास. मराठी साहित्यातील सर्वाधिक चर्चित आणि वादळी कादंबऱ्यांपैकी एक.', 'physical_book', 'mr', 'fiction', '9788177665898', 45000, 55000, '/covers/kosla.svg', NULL, NULL, 26, true, false, false, true, '2026-07-21T11:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000004', 'राजा शिवछत्रपती', 'Raja Shivchhatrapati', 'raja-shivchhatrapati', 'शिवचरित्राचा सर्वांगीण वेध', 'ब. मा. पुरंदरे', 'छत्रपती शिवाजी महाराजांच्या जीवनाचा, त्यांच्या विचाराचा आणि स्वराज्याच्या उभारणीचा सर्वांगीण वेध घेणारा ऐतिहासिक ग्रंथ. पुरंदरे यांच्या अभ्यासू लेखणीतून उभा राहणारा शिवचरित्राचा मानबिंदू.', 'physical_book', 'mr', 'history', '9789386887644', 69900, 85000, '/covers/raja-shivchhatrapati.svg', NULL, NULL, 35, true, false, true, true, '2026-06-12T07:45:00+00:00'),
  ('a1000000-0000-4000-8000-000000000005', 'दिवाळी अंक २०२६ — दीपोत्सव', 'Diwali Ank 2026 — Deepotsav', 'diwali-ank-2026', 'दिवाळी अंक २०२६ · विशेष कथा संग्रह', 'मौज प्रकाशन', 'दिवाळीच्या मनोरंजनासाठी खास तयार झालेला समृद्ध अंक. नव्या कथा, कविता, ललित लेख, व्यंगचित्रे आणि साहित्यचर्चा यांचा मेळ. यंदाचा अंक विशेषतः नव्या मराठी कथाकारांवर केंद्रित आहे.', 'magazine_print', 'mr', 'special-editions', '0971-2345', 35000, 40000, '/covers/diwali-ank-2026.svg', NULL, NULL, 120, true, true, true, true, '2026-10-15T05:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000006', 'चालू घडामोडी २०२६', 'Chalu Ghadamodi 2026', 'chalu-ghadamodi-2026', 'स्पर्धा परीक्षांची अद्ययावत मार्गदर्शिका', 'स्पर्धा प्रकाशन', 'MPSC, UPSC आणि इतर स्पर्धा परीक्षांसाठी २०२६ मधील राष्ट्रीय व आंतरराष्ट्रीय घडामोडींचा संपूर्ण आढावा. संक्षिप्त नोट्स, सराव प्रश्न आणि मागील वर्षांच्या प्रश्नपत्रिकांचे विश्लेषण.', 'physical_book', 'mr', 'competitive-exams', '9789389871234', 29900, 39900, '/covers/chalu-ghadamodi-2026.svg', NULL, NULL, 60, false, true, false, true, '2026-10-28T04:20:00+00:00'),
  ('a1000000-0000-4000-8000-000000000007', 'मनाचे श्लोक', 'Manache Shlok', 'manache-shlok', 'संत रामदासांचे २०५ श्लोक · सचित्र आवृत्ती', 'संत रामदास', 'समर्थ रामदास स्वामींच्या मनाचे श्लोकांची सोप्या भाषेत समजून घेण्यासाठी खास सचित्र ई-आवृत्ती. रोजच्या जीवनातील मूल्ये, ध्येयनिष्ठा आणि आत्मविश्वास यांचा मार्ग दाखवणारे श्लोक.', 'ebook', 'mr', 'spirituality', '9789391044123', 9900, 14900, '/covers/manache-shlok.svg', NULL, 'ebooks/manache-shlok.pdf', 0, true, false, false, true, '2026-09-05T10:10:00+00:00'),
  ('a1000000-0000-4000-8000-000000000008', 'स्टार्टअप महाराष्ट्र', 'Startup Maharashtra', 'startup-maharashtra', 'मराठी उद्योजकांच्या यशोगाथा', 'अमोल देशपांडे', 'पुणे, मुंबई आणि नाशिकच्या तरुण उद्योजकांनी उभ्या केलेल्या स्टार्टअप्सच्या प्रेरणादायी गोष्टी. कल्पनेपासून उभारणीपर्यंतचा प्रवास, अडचणी आणि त्यावर मात करण्याचे धडे.', 'ebook', 'mr', 'business', '9789391044871', 24900, 34900, '/covers/startup-maharashtra.svg', NULL, 'ebooks/startup-maharashtra.pdf', 0, false, true, false, true, '2026-10-20T08:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000009', 'अन्नपूर्णा: मराठी पाककृती', 'Annapurna: Marathi Recipes', 'annapurna-marathi-pakkruti', 'घरगुती मराठी चवींचा खजिना', 'सुनीता कुलकर्णी', 'कोकणची कालवणापासून विदर्भाच्या पोहेपर्यंत, प्रत्येक घरातील आवडत्या मराठमोळ्या पाककृतींचा संग्रह. सोप्या सूचना, फोटो आणि टिप्ससह नवख्या पाकशास्त्रींसाठीही उपयुक्त.', 'physical_book', 'mr', 'cooking', '9789389871289', 49900, 59900, '/covers/annapurna-marathi-pakkruti.svg', NULL, NULL, 18, false, false, false, true, '2026-07-30T12:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000010', 'पानिपत', 'Panipat', 'panipat', '१७६१ च्या युद्धाची महाकाव्य कथा', 'विश्वास पाटील', 'पानिपतच्या तिसऱ्या युद्धाच्या पार्श्वभूमीवर उभी राहणारी भव्य ऐतिहासिक कादंबरी. मराठ्यांच्या पराक्रमाची आणि त्यागाची अखेरची झळाळी जिवंत करणारे पुस्तक.', 'physical_book', 'mr', 'history', '9788177666185', 35000, 45000, '/covers/panipat.svg', NULL, NULL, 32, true, false, false, true, '2026-05-11T09:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000011', 'विचारवेध — ऑक्टोबर २०२६', 'Vicharvedh — October 2026', 'vicharvedh-october-2026', 'विचारांचे मासिक · डिजिटल आवृत्ती', 'विचारवेध प्रकाशन', 'समकालीन राजकारण, अर्थव्यवस्था, तंत्रज्ञान आणि संस्कृतीवरील विचारप्रवर्तक लेखांचा मासिक अंक. आपल्या आजूबाजूला घडणाऱ्या गोष्टींकडे नव्या नजरेने पाहायला शिकवणारे वाचन.', 'magazine_digital', 'mr', 'current-affairs', '2582-4410', 6000, 8000, '/covers/vicharvedh-october-2026.svg', NULL, 'magazines/vicharvedh-october-2026.pdf', 0, true, true, false, true, '2026-10-01T00:30:00+00:00'),
  ('a1000000-0000-4000-8000-000000000012', 'बालभारती दिवाळी अंक २०२६', 'Balbharati Diwali Ank 2026', 'balbharati-diwali-ank-2026', 'मुलांसाठी खास दिवाळी अंक', 'बालभारती', 'लहान मुलांसाठी गोष्टी, कोडी, चित्रकला, सायन्स प्रयोग आणि सणाचा आनंद घेऊन येणारा रंगीत दिवाळी अंक. सुट्टीतल्या दिवसांना अधिक मजेदार बनवणारे वाचन.', 'magazine_digital', 'mr', 'special-editions', '0973-5589', 15000, 18000, '/covers/balbharati-diwali-ank-2026.svg', NULL, 'magazines/balbharati-diwali-ank-2026.pdf', 0, false, true, false, true, '2026-10-18T06:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000013', 'गोदान', 'Godaan', 'godaan', 'हिंदी साहित्य की अमर क्लासिक', 'मुंशी प्रेमचंद', 'भारतीय किसान के जीवन, संघर्ष और सपनों की अमर गाथा. प्रेमचंद की यह क्लासिक रचना आज भी ग्रामीण भारत की सच्चाई को उतनी ही तीव्रता से चित्रित करती है.', 'physical_book', 'hi', 'fiction', '9788126405353', 25000, 32500, '/covers/godaan.svg', NULL, NULL, 55, true, false, false, true, '2026-06-25T08:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000014', 'रामचरितमानस', 'Ramcharitmanas', 'ramcharitmanas', 'गोस्वामी तुलसीदास · सचित्र संस्करण', 'गोस्वामी तुलसीदास', 'रामकथा का लोकप्रिय और भावपूर्ण महाकाव्य, सरल अर्थ और सुंदर चित्रों के साथ. पूरे परिवार के लिए आदर्श पारिवारिक पाठ.', 'physical_book', 'hi', 'spirituality', '9788126412108', 45000, 55000, '/covers/ramcharitmanas.svg', NULL, NULL, 40, false, false, false, true, '2026-04-14T05:30:00+00:00'),
  ('a1000000-0000-4000-8000-000000000015', 'आधुनिक भारत का इतिहास', 'Adhunik Bharat Ka Itihas', 'adhunik-bharat-ka-itihas', 'प्रतियोगी परीक्षाओं के लिए विशेष संस्करण', 'डॉ. राधेश्याम सिंह', 'स्वतंत्रता संग्राम से लेकर समकालीन भारत तक की राजनीतिक, सामाजिक और आर्थिक यात्रा. UPSC, PSC और अन्य प्रतियोगी परीक्षाओं के लिए तथ्यों और विश्लेषण का संतुलित संग्रह.', 'physical_book', 'hi', 'competitive-exams', '9789351728456', 39900, 49900, '/covers/adhunik-bharat-ka-itihas.svg', NULL, NULL, 45, false, true, false, true, '2026-10-22T09:30:00+00:00'),
  ('a1000000-0000-4000-8000-000000000016', 'मधुशाला', 'Madhushala', 'madhushala', 'हरिवंशराय बच्चन की अमर कविताएँ', 'हरिवंशराय बच्चन', 'जीवन के उतार-चढ़ाव, प्रेम और दर्शन को मधुशाला के रूपक में पिरोने वाली अमर काव्य रचना. हर पीढ़ी ने इसे अपने तरीके से पढ़ा और जिया है.', 'ebook', 'hi', 'poetry', '9789391044321', 9900, 14900, '/covers/madhushala.svg', NULL, 'ebooks/madhushala.pdf', 0, false, false, false, true, '2026-08-19T07:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000017', 'सारिका दिवाळी अंक २०२६', 'Sarika Diwali Ank 2026', 'sarika-diwali-ank-2026', 'दिवाळी विशेषांक · डिजिटल संस्करण', 'सारिका प्रकाशन', 'कहानी, कविता, संस्मरण और साहित्यिक चर्चा से भरपूर दिवाळी विशेषांक. नए लेखकों की ताज़ा रचनाओं के साथ साहित्य-प्रेमियों के लिए एक संपूर्ण पठन अनुभव.', 'magazine_digital', 'hi', 'special-editions', '0974-118X', 18000, 22000, '/covers/sarika-diwali-ank-2026.svg', NULL, 'magazines/sarika-diwali-ank-2026.pdf', 0, true, true, false, true, '2026-10-16T06:15:00+00:00'),
  ('a1000000-0000-4000-8000-000000000018', 'स्टार्टअप इंडिया', 'Startup India', 'startup-india', 'भारतीय उद्यमियों की सफलता की कहानियाँ', 'रितिका शर्मा', 'छोटे शहरों से निकलकर बड़े ब्रांड बनाने वाले भारतीय संस्थापकों की प्रेरक कहानियाँ. आइडिया से आईपीओ तक की यात्रा में काम आने वाले व्यावहारिक सबक.', 'ebook', 'hi', 'business', '9789391044987', 29900, 39900, '/covers/startup-india.svg', NULL, 'ebooks/startup-india.pdf', 0, false, true, false, true, '2026-10-24T10:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000019', 'गृहशोभा — अक्टूबर २०२६', 'Grihshobha — October 2026', 'grihshobha-october-2026', 'मासिक पत्रिका · प्रिंट संस्करण', 'गृहशोभा', 'घर, रसोई, फैशन और रिश्तों से जुड़ी ताज़ा और उपयोगी सामग्री. परिवार के हर सदस्य के लिए पठनीय और व्यावहारिक मासिक पत्रिका.', 'magazine_print', 'hi', 'current-affairs', '0971-8947', 12000, 15000, '/covers/grihshobha-october-2026.svg', NULL, NULL, 70, true, false, false, true, '2026-10-05T05:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000020', 'The Palace of Illusions', 'The Palace of Illusions', 'the-palace-of-illusions', 'A novel of the Mahabharata', 'Chitra Banerjee Divakaruni', 'A luminous retelling of the Mahabharata from Draupadi''s point of view. Palace intrigue, fierce love and the cost of destiny, told with cinematic sweep and unforgettable voice.', 'physical_book', 'en', 'fiction', '9780385515993', 49900, 59900, '/covers/the-palace-of-illusions.svg', NULL, NULL, 30, true, false, true, true, '2026-07-08T08:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000021', 'India After Gandhi', 'India After Gandhi', 'india-after-gandhi', 'The History of the World''s Largest Democracy', 'Ramachandra Guha', 'The definitive account of independent India — its democratic experiments, fractures and resilience. A sweeping narrative that turns the world''s largest democracy into an intimate, human story.', 'physical_book', 'en', 'history', '9780330505543', 79900, 99900, '/covers/india-after-gandhi.svg', NULL, NULL, 22, true, false, true, true, '2026-06-02T08:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000022', 'Atomic Habits', 'Atomic Habits', 'atomic-habits', 'An Easy & Proven Way to Build Good Habits', 'James Clear', 'Tiny changes, remarkable results. A practical framework for building better habits, breaking bad ones and mastering the small decisions that compound into extraordinary outcomes.', 'physical_book', 'en', 'self-help', '9781847941831', 49900, 69900, '/covers/atomic-habits.svg', NULL, NULL, 65, true, true, false, true, '2026-10-10T09:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000023', 'The Alchemist', 'The Alchemist', 'the-alchemist', 'A fable about following your dream', 'Paulo Coelho', 'A shepherd boy''s journey across the desert becomes a timeless meditation on dreams, omens and the treasure that waits where we least expect it.', 'ebook', 'en', 'fiction', '9780062315007', 19900, 29900, '/covers/the-alchemist.svg', NULL, 'ebooks/the-alchemist.pdf', 0, true, false, false, true, '2026-08-28T07:15:00+00:00'),
  ('a1000000-0000-4000-8000-000000000024', 'Mint Money', 'Mint Money', 'mint-money', 'A practical guide to personal finance', 'Ankur Warikoo', 'A no-nonsense playbook for earning, saving and investing in India. Understand tax, insurance, mutual funds and the psychology of money without the jargon.', 'ebook', 'en', 'business', '9789391044456', 29900, 39900, '/covers/mint-money.svg', NULL, 'ebooks/mint-money.pdf', 0, false, true, false, true, '2026-10-26T05:45:00+00:00'),
  ('a1000000-0000-4000-8000-000000000025', 'National Geographic India — October 2026', 'National Geographic India — October 2026', 'natgeo-india-october-2026', 'Wildlife of the Western Ghats', 'National Geographic India', 'A stunning digital edition exploring the hidden rainforests of the Western Ghats. Long-form reportage, award-winning photography and a field guide to India''s biodiversity.', 'magazine_digital', 'en', 'current-affairs', '2582-8890', 19900, 24900, '/covers/natgeo-india-october-2026.svg', NULL, 'magazines/natgeo-india-october-2026.pdf', 0, false, true, false, true, '2026-10-03T05:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000026', 'Ikigai', 'Ikigai', 'ikigai', 'The Japanese secret to a long and happy life', 'Héctor García & Francesc Miralles', 'The Japanese concept of ikigai — a reason to jump out of bed each morning. A gentle, research-backed guide to purpose, community and joyful longevity.', 'physical_book', 'en', 'self-help', '9781786330895', 39900, 49900, '/covers/ikigai.svg', NULL, NULL, 50, false, false, false, true, '2026-07-16T06:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000027', 'பொன்னியின் செல்வன்', 'Ponniyin Selvan', 'ponniyin-selvan', 'சோழப் பேரரசின் காப்பியம்', 'கல்கி', 'சோழப் பேரரசின் பொற்காலத்தை அழகாகச் சித்திரிக்கும் வரலாற்று நாவல். அரசியல் சூழ்ச்சிகள், வீரம், காதல் என அனைத்தும் கலந்த அமர காவியம்.', 'physical_book', 'ta', 'fiction', '9788126424453', 59900, 69900, '/covers/ponniyin-selvan.svg', NULL, NULL, 25, true, false, false, true, '2026-06-20T06:45:00+00:00'),
  ('a1000000-0000-4000-8000-000000000028', 'திருக்குறள்', 'Thirukkural', 'thirukkural', 'அறத்துப்பால், பொருட்பால், காமத்துப்பால்', 'திருவள்ளுவர்', 'திருவள்ளுவரின் 1330 குறள்கள், எளிய விளக்கங்களுடன். அறம், பொருள், காமம் என வாழ்வின் அனைத்து பரிமாணங்களையும் தொட்டுச் செல்லும் அழியாத நூல்.', 'ebook', 'ta', 'spirituality', '9789391044678', 9900, 14900, '/covers/thirukkural.svg', NULL, 'ebooks/thirukkural.pdf', 0, false, false, false, true, '2026-05-30T08:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000029', 'গোরা', 'Gora', 'gora', 'রবীন্দ্রনাথ ঠাকুরের কালজয়ী উপন্যাস', 'রবীন্দ্রনাথ ঠাকুর', 'জাতি, ধর্ম ও পরিচয়ের প্রশ্নে বাঙালি সমাজকে নতুন করে ভাবতে শেখানো এক কালজয়ী উপন্যাস. রবীন্দ্রনাথের গভীর মানবতাবোধে ঋদ্ধ এই ক্লাসিক.', 'physical_book', 'bn', 'fiction', '9788177562135', 35000, 45000, '/covers/gora.svg', NULL, NULL, 28, false, false, false, true, '2026-06-18T07:30:00+00:00'),
  ('a1000000-0000-4000-8000-000000000030', 'আনন্দমঠ', 'Anandamath', 'anandamath', 'বঙ্কিমচন্দ্র চট্টোপাধ্যায়ের ঐতিহাসিক উপন্যাস', 'বঙ্কিমচন্দ্র চট্টোপাধ্যায়', 'বন্দেমাতরমের স্রষ্টার কলমে দেশপ্রেম ও ত্যাগের অমর কাহিনি. সন্ন্যাসী বিদ্রোহের পটভূমিতে লেখা বাংলা সাহিত্যের এক অমূল্য রত্ন.', 'ebook', 'bn', 'fiction', '9789391044760', 14900, 19900, '/covers/anandamath.svg', NULL, 'ebooks/anandamath.pdf', 0, false, false, false, true, '2026-05-05T09:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000031', 'వేయిపడగలు', 'Veyipadagalu', 'veyipadagalu', 'విశ్వనాథ సత్యనారాయణ క్లాసిక్', 'విశ్వనాథ సత్యనారాయణ', 'తెలుగు సాహిత్యంలో ఒక మైలురాయి. మనిషి జీవితపు వైవిధ్యాన్ని, సమాజ మార్పులను అద్భుతంగా చిత్రించిన విశ్వనాథ సత్యనారాయణ రచన.', 'physical_book', 'te', 'fiction', '9788126424583', 44900, 54900, '/covers/veyipadagalu.svg', NULL, NULL, 20, false, true, false, true, '2026-10-12T06:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000032', 'સરસ્વતીચંદ્ર', 'Saraswatichandra', 'saraswatichandra', 'ગોવર્ધનરામ ત્રિપાઠીની ધ્યેયનવલ', 'ગોવર્ધનરામ ત્રિપાઠી', 'ગુજરાતી સાહિત્યની સૌથી પ્રભાવશાળી નવલકથાઓમાંની એક. પ્રેમ, ત્યાગ અને આધ્યાત્મિક સાધનાને જોડતી સરસ્વતીચંદ્રની અમર કથા.', 'physical_book', 'gu', 'fiction', '9788177668400', 39900, 49900, '/covers/saraswatichandra.svg', NULL, NULL, 24, false, false, false, true, '2026-04-28T07:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000033', 'ಮಂಕುತಿಮ್ಮನ ಕಗ್ಗ', 'Mankutimmana Kagga', 'mankutimmana-kagga', 'ಡಿ.ವಿ. ಗುಂಡಪ್ಪ ಅವರ ಜೀವನ ದರ್ಶನ', 'ಡಿ.ವಿ. ಗುಂಡಪ್ಪ', 'ಜೀವನದ ಸಾರವನ್ನು ಸರಳ ಕನ್ನಡ ಕಗ್ಗಗಳಲ್ಲಿ ಹೇಳುವ ಅಮರ ಕೃತಿ. ಪ್ರತಿ ಓದಿಗೂ ಹೊಸ ಅರ್ಥ ಮತ್ತು ಆತ್ಮವಿಶ್ವಾಸ ನೀಡುವ ಕನ್ನಡ ಸಾಹಿತ್ಯದ ಕಣ್ಮಣಿ.', 'ebook', 'kn', 'poetry', '9789391044895', 14900, 19900, '/covers/mankutimmana-kagga.svg', NULL, 'ebooks/mankutimmana-kagga.pdf', 0, true, false, false, true, '2026-09-22T08:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000034', 'ആടുജീവിതം', 'Aadujeevitham', 'aadujeevitham', 'ബെന്യാമിൻ്റെ ഹൃദയസ്പർശിയായ നോവൽ', 'ബെന്യാമിൻ', 'ഗൾഫ് മണലിൽ ജീവിതം തേടിയ ഒരു മലയാളിയുടെ യഥാർത്ഥ അനുഭവക്കഥ. ദുരിതത്തിലും പ്രതീക്ഷ കൈവിടാത്ത നജീബിന്റെ ജീവിതം വായനക്കാരന്റെ ഹൃദയം തൊടും.', 'physical_book', 'ml', 'fiction', '9788126424668', 34900, 44900, '/covers/aadujeevitham.svg', NULL, NULL, 21, true, false, false, true, '2026-08-08T07:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000035', 'ਗੁਰੂ ਨਾਨਕ ਦੇਵ', 'Guru Nanak Dev', 'guru-nanak-dev', 'ਜੀਵਨ, ਸਿੱਖਿਆ ਅਤੇ ਵਿਰਾਸਤ', 'ਪ੍ਰੋ. ਕਰਤਾਰ ਸਿੰਘ', 'ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ ਦੇ ਜੀਵਨ, ਉਪਦੇਸ਼ਾਂ ਅਤੇ ਵਿਰਾਸਤ ਦਾ ਸਰਲ ਅਤੇ ਪ੍ਰਮਾਣਿਕ ਵੇਰਵਾ. ਸਿੱਖ ਧਰਮ ਦੀਆਂ ਜੜ੍ਹਾਂ ਨੂੰ ਸਮਝਣ ਲਈ ਇੱਕ ਭਰੋਸੇਯੋਗ ਪੁਸਤਕ.', 'physical_book', 'pa', 'spirituality', '9788177668578', 29900, 39900, '/covers/guru-nanak-dev.svg', NULL, NULL, 30, false, false, false, true, '2026-04-10T06:00:00+00:00'),
  ('a1000000-0000-4000-8000-000000000036', 'ମାଟିର ମଣିଷ', 'Matira Manisha', 'matira-manisha', 'କାଳିନ୍ଦୀ ଚରଣ ପାଣିଗ୍ରାହୀଙ୍କ ଅମର ଉପନ୍ୟାସ', 'କାଳିନ୍ଦୀ ଚରଣ ପାଣିଗ୍ରାହୀ', 'ଓଡ଼ିଆ ସାହିତ୍ୟର ଏକ ଅମର କୃତି. ଗ୍ରାମୀଣ ଜୀବନ, ପାରିବାରିକ ସମ୍ପର୍କ ଓ ମାଟିର ମୋହକୁ ହୃଦୟସ୍ପର୍ଶୀ ଭାବରେ ଚିତ୍ରଣ କରୁଥିବା ଉପନ୍ୟାସ.', 'ebook', 'or', 'fiction', '9789391044932', 14900, 19900, '/covers/matira-manisha.svg', NULL, 'ebooks/matira-manisha.pdf', 0, false, false, false, true, '2026-05-20T06:00:00+00:00')
on conflict (id) do nothing;

-- Homepage advertising slots
insert into public.ad_banners
  (id, title, slot_position, desktop_image_url, mobile_image_url, target_url,
   language_code, starts_at, ends_at, is_active, priority)
values
  ('6b9d3a2e-4c1f-4a72-9a01-1e6f0f8a2c01', 'दिवाळी अंक महोत्सव · Diwali Editions Festival', 'hero_carousel', '/banners/hero-diwali.svg', '/banners/hero-diwali.svg', '/browse?collection=magazines', NULL, '2026-10-01T00:00:00+00:00', NULL, true, 10),
  ('6b9d3a2e-4c1f-4a72-9a01-1e6f0f8a2c02', 'मराठी साहित्याचा खजिना · Marathi Literary Vault', 'hero_carousel', '/banners/hero-marathi.svg', '/banners/hero-marathi.svg', '/browse?language=mr', NULL, '2026-10-01T00:00:00+00:00', NULL, true, 8),
  ('6b9d3a2e-4c1f-4a72-9a01-1e6f0f8a2c03', 'नवीन प्रकाशने · Fresh Off The Press', 'mid_feed_1', '/banners/mid-latest.svg', '/banners/mid-latest.svg', '/browse?collection=latest', NULL, '2026-10-01T00:00:00+00:00', NULL, true, 6),
  ('6b9d3a2e-4c1f-4a72-9a01-1e6f0f8a2c04', 'ई-बुक्स ₹९९ पासून · e-Books from ₹99', 'mid_feed_2', '/banners/mid-ebooks.svg', '/banners/mid-ebooks.svg', '/browse?type=ebook', NULL, '2026-10-01T00:00:00+00:00', NULL, true, 5)
on conflict (id) do nothing;

commit;
