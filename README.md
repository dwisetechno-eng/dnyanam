# ज्ञानम · Dnyanam

An OTT-style, multilingual bookstore for physical books, e-books and magazines. The interface ships in **Marathi by default**, with instant switches to Hindi and English, and a separate ribbon for browsing catalogue content in 12 Indian languages, Sanskrit included.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Supabase and Razorpay.

---

## What's inside

- **Storefront** — hero carousel, trending / latest / magazines / e-books rails, mid-feed ad banners, browse with filters, search, product detail with sample preview.
- **Languages** — UI locale (`mr` default, `hi`, `en`) stored in a cookie + localStorage; independent catalogue-language ribbon covering Marathi, Hindi, English, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Punjabi and Odia.
- **Cart & checkout** — persistent cart, free-shipping threshold, address capture for physical books, Razorpay checkout, idempotent webhook fulfilment.
- **My Library** — purchased e-books and digital magazines, with signed-URL downloads (or a demo library in browser storage).
- **Admin** — dashboard with revenue/order stats, order list, catalogue CRUD with cover/sample/digital-file uploads, banner management, plus bulk CSV upload with a downloadable sample file.
- **Demo mode** — runs the full storefront with seeded JSON data when Supabase/Razorpay keys are absent.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js `15.5` App Router, React `19`, TypeScript |
| Styling | Tailwind CSS `3.4`, Lucide icons, Noto Sans Devanagari + Plus Jakarta Sans |
| Data / auth / storage | Supabase (Postgres, RLS, Auth, Storage) |
| Payments | Razorpay Orders + Checkout + webhooks |
| Validation | Zod |

## Quick start

```bash
npm install
cp .env.example .env.local     # optional for demo mode
npm run dev
```

Open <http://localhost:3000>. With no environment variables set the app boots in **demo mode**: catalogue data comes from `data/catalog.json`, checkout simulates payment, and purchased e-books are stored in `localStorage`.

### Demo mode behaviour

| Area | Demo behaviour |
| --- | --- |
| Catalogue | `data/catalog.json` + generated SVG covers |
| Auth | Sign-in page explains that Supabase is required |
| Checkout | Address validation still runs for physical items; payment is simulated after a short delay |
| Fulfilment | Digital items are added to `dnyanam.demo.library.v1` and appear in **My Library** |
| Admin | Shows a "not configured" state |

Clear the demo library from the library page or by removing the localStorage key.

## Environment variables

Copy `.env.example` to `.env.local`:

```ini
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

- `SUPABASE_SERVICE_ROLE_KEY` is **server-only**. It is used for pricing, order fulfilment and signed downloads. Never expose it with a `NEXT_PUBLIC_` prefix.
- Demo mode is disabled as soon as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/migrations/001_initial_schema.sql`. It creates:
   - tables: `languages`, `profiles`, `catalog_items`, `ad_banners`, `orders`, `order_items`, `user_library`, `webhook_events`
   - RLS policies, indexes, triggers, `public.fulfill_paid_order(...)`
   - storage buckets: `covers` (public), `samples` (public), `digital_assets` (private)
   - seed languages, catalogue items and banners
3. Copy the project URL, anon key and service-role key into `.env.local`.
4. In **Authentication → Providers**, enable Email. For local testing you may disable "Confirm email" so sign-up works immediately.
5. Add your site URL and `http://localhost:3000/auth/callback` to **Authentication → URL Configuration**.

### Promote an admin

Sign up once through `/login`, then run this in the SQL editor with the user's ID (Authentication → Users):

```sql
update public.profiles
set role = 'admin'
where id = '<auth-user-id>';
```

Visit `/admin`. Admins can manage catalogue items, covers, samples, banners and digital files. Digital asset uploads go to the private `digital_assets` bucket.

### Bulk upload the catalogue

`/admin` -> Books & Magazines -> **Bulk upload catalogue** adds or updates many
titles in one go. The modal has a **Download sample CSV** button that saves
`dnyanam-catalog-sample.csv` with the full header row and three example rows
(physical book, e-book, digital magazine).

- Required columns: `title`, `author_or_publisher`, `item_type`, `language_code`,
  `category`, `price_rupees`, `cover_image_url`.
- Header aliases are accepted, so sheets exported from Excel/Sheets work
  (`author`, `price`, `mrp`, `stock`, `language`, `type`, ...).
- Prices are entered in rupees and stored as paise; `mrp_rupees` defaults to the
  selling price.
- `language_code` accepts the code (`mr`, `hi`, `en`, `sa`, ...) or the language
  name in Marathi, Hindi, English or native script.
- Rows are upserted on `slug`, so re-uploading the same file updates rows instead
  of duplicating them. Keep `slug` stable to preserve order/library links, or
  leave it empty to have one generated from `title_en` / `title`.
- Invalid rows are reported by spreadsheet line number and skipped; valid rows
  still import. Limits: 5 MB and 2000 rows per upload.
- Importing runs server-side at `POST /api/admin/catalog/import`, admin-only
  (role checked against `public.profiles`), and re-validates every row.

After editing `data/languages.json` or `data/catalog.json`, run
`npm run db:generate` and re-apply `supabase/migrations/001_initial_schema.sql`
to refresh the demo art, seed SQL and language rows.

## Razorpay setup

1. Create a Razorpay account and generate API keys (Test mode is fine).
2. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env.local`.
3. Create a webhook pointing to `https://<your-domain>/api/webhooks/razorpay` with a secret, then set `RAZORPAY_WEBHOOK_SECRET`.
4. Subscribe to these events:
   - `payment.captured`
   - `order.paid`
   - `payment.failed`
5. For local testing, expose port 3000 (for example with `ngrok http 3000`) and use the public URL for the webhook and `NEXT_PUBLIC_SITE_URL`.

Fulfilment notes:

- The server always re-reads prices from `catalog_items`; client-supplied amounts are ignored.
- `/api/checkout/verify` verifies the checkout signature before fulfilling.
- The webhook verifies `x-razorpay-signature` against the raw request body and uses `x-razorpay-event-id` for idempotency.
- `fulfill_paid_order(...)` runs as a single database transaction, marks the order paid, creates library entries and decrements stock.
- Duplicate webhook deliveries return `{ "status": "already_processed" }`.

## Scripts

```bash
npm run dev             # start the dev server
npm run build           # production build
npm run start           # serve the production build
npm run generate:covers # regenerate SVG covers/banners from data/*.json
npm run generate:sql    # rebuild 001_initial_schema.sql from _base.sql + data
npm run db:generate     # both of the above
```

The canonical seed data lives in `data/`; both the SQL migration and the demo storefront are generated from it. Re-run `npm run db:generate` after editing catalogue data, then re-apply the migration.

## Project structure

```text
app/
  page.tsx                  home (hero, rails, ads)
  browse/                   catalogue with filters
  search/                   search results
  item/[slug]/              product detail + sample modal
  library/                  purchased digital items
  login/                    sign in / sign up
  admin/                    admin dashboard (role-gated)
  info/[slug]/              about, contact, help, returns, privacy, terms
  api/checkout/             create-order + verify
  api/webhooks/razorpay/    signed, idempotent webhook
  api/download/[itemId]/    signed download URL
components/                 UI, cart drawer, admin forms, library client
lib/
  catalog.ts                Supabase/demo data access
  demo.ts                   demo catalogue loader
  demo-library.ts           localStorage library (demo mode)
  i18n/                     typed dictionaries + provider
  payments/                 Razorpay helpers + fulfilment
  supabase/                 browser/server/admin clients
messages/                   mr.json (default), hi.json, en.json
supabase/migrations/        schema, RLS, storage, seeds
data/                       source JSON used to generate SQL + assets
scripts/                    asset and SQL generators
```

## Language model

Two independent settings:

1. **Interface language** — header switch, stored in the `dnyanam.locale` cookie and localStorage. Marathi (`mr`) is the default for first-time visitors; Hindi and English are one tap away. All three dictionaries in `messages/` have matching keys (currently 414 keys).
2. **Book language** — the ribbon below the header filters the catalogue by content language. It never changes the UI language.

To add a UI locale, add a JSON file under `messages/`, extend the locale list in `lib/i18n/config.ts`, and add the option to the header switcher.

## Accessibility & design notes

- Dark OTT theme: `#0B0F19` background, `#151C2C` surfaces, saffron `#F59E0B` and rose `#E11D48` accents.
- Devanagari body copy keeps a line-height of at least `1.4`.
- Rails are touch-scrollable with snap points; arrow controls appear on larger screens.
- Reduced-motion preferences are respected by the global stylesheet.

## Deployment checklist

- Set all environment variables in your host (Vercel or similar), including the service-role key (server-only).
- Set `NEXT_PUBLIC_SITE_URL` to the production URL.
- Point the Razorpay webhook at the production domain and verify a test payment end to end.
- Apply `supabase/migrations/001_initial_schema.sql` to the production project.
- Confirm storage bucket policies: `covers`/`samples` public, `digital_assets` private.
- Promote at least one admin account.
