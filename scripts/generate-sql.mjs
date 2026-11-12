/**
 * Builds supabase/migrations/001_initial_schema.sql from _base.sql
 * and the JSON seed sources in data/.
 *
 * Run: npm run generate:sql
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const languages = read("data/languages.json");
const catalog = read("data/catalog.json");
const banners = read("data/banners.json");

const q = (value) => {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
};
const b = (value) => (value ? "true" : "false");
const n = (value) => (value === null || value === undefined ? "NULL" : String(value));

const languageRows = languages
  .map(
    (l) =>
      `  (${q(l.code)}, ${q(l.name_mr)}, ${q(l.name_hi)}, ${q(l.name_en)}, ${q(
        l.name_native,
      )}, ${b(l.is_active)}, ${l.sort_order})`,
  )
  .join(",\n");

const languagesSql = `insert into public.languages
  (code, name_mr, name_hi, name_en, name_native, is_active, sort_order)
values
${languageRows}
on conflict (code) do update set
  name_mr = excluded.name_mr,
  name_hi = excluded.name_hi,
  name_en = excluded.name_en,
  name_native = excluded.name_native,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;`;

const catalogRows = catalog
  .map(
    (i) =>
      `  (${q(i.id)}, ${q(i.title)}, ${q(i.title_en)}, ${q(i.slug)}, ${q(
        i.subtitle_or_edition,
      )}, ${q(i.author_or_publisher)}, ${q(i.description)}, ${q(
        i.item_type,
      )}, ${q(i.language_code)}, ${q(i.category)}, ${q(i.isbn_or_issn)}, ${
        i.price_paise
      }, ${i.mrp_paise}, ${q(i.cover_image_url)}, ${q(i.sample_pdf_url)}, ${q(
        i.digital_file_path,
      )}, ${i.stock_quantity}, ${b(i.is_trending)}, ${b(
        i.is_latest_arrival,
      )}, ${b(i.is_hero_featured)}, ${b(i.is_published)}, ${q(i.created_at)})`,
  )
  .join(",\n");

const catalogSql = `insert into public.catalog_items
  (id, title, title_en, slug, subtitle_or_edition, author_or_publisher, description,
   item_type, language_code, category, isbn_or_issn, price_paise, mrp_paise,
   cover_image_url, sample_pdf_url, digital_file_path, stock_quantity,
   is_trending, is_latest_arrival, is_hero_featured, is_published, created_at)
values
${catalogRows}
on conflict (id) do nothing;`;

const bannerRows = banners
  .map(
    (banner) =>
      `  (${q(banner.id)}, ${q(banner.title)}, ${q(banner.slot_position)}, ${q(
        banner.desktop_image_url,
      )}, ${q(banner.mobile_image_url)}, ${q(banner.target_url)}, ${q(
        banner.language_code,
      )}, ${q(banner.starts_at)}, ${q(banner.ends_at)}, ${b(
        banner.is_active,
      )}, ${banner.priority})`,
  )
  .join(",\n");

const bannersSql = `insert into public.ad_banners
  (id, title, slot_position, desktop_image_url, mobile_image_url, target_url,
   language_code, starts_at, ends_at, is_active, priority)
values
${bannerRows}
on conflict (id) do nothing;`;

let schema = readFileSync(join(root, "supabase/migrations/_base.sql"), "utf8");
schema = schema
  .replace("-- __LANGUAGES__", languagesSql)
  .replace("-- __CATALOG__", catalogSql)
  .replace("-- __BANNERS__", bannersSql);

writeFileSync(join(root, "supabase/migrations/001_initial_schema.sql"), schema);

console.log(
  `✔ Wrote 001_initial_schema.sql · ${languages.length} languages · ${catalog.length} catalog items · ${banners.length} banners.`,
);
