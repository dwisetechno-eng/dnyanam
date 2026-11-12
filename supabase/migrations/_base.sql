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
-- __LANGUAGES__

-- Catalog — 36 richly varied titles across 11 Indian languages
-- __CATALOG__

-- Homepage advertising slots
-- __BANNERS__

commit;
