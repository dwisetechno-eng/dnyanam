import { slugify } from "@/lib/utils";
import type { ItemType, Language } from "@/lib/types";

/**
 * Shared catalogue bulk-import contract.
 *
 * Used by the admin bulk-upload modal (to preview + validate in the browser)
 * and by the `POST /api/admin/catalog/import` route (to re-validate and write
 * with the service-role client). Keep both sides on this single schema so the
 * sample file, the preview and the server never disagree.
 */

export const IMPORT_COLUMNS = [
  "title",
  "title_en",
  "slug",
  "subtitle_or_edition",
  "author_or_publisher",
  "description",
  "item_type",
  "language_code",
  "category",
  "isbn_or_issn",
  "price_rupees",
  "mrp_rupees",
  "cover_image_url",
  "sample_pdf_url",
  "digital_file_path",
  "stock_quantity",
  "is_trending",
  "is_latest_arrival",
  "is_hero_featured",
  "is_published",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

/** Columns that must be present in the header row. */
export const REQUIRED_COLUMNS: ImportColumn[] = [
  "title",
  "author_or_publisher",
  "item_type",
  "language_code",
  "category",
  "price_rupees",
  "cover_image_url",
];

export const MAX_IMPORT_ROWS = 2000;

export interface PreparedCatalogItem {
  title: string;
  title_en: string | null;
  slug: string;
  subtitle_or_edition: string | null;
  author_or_publisher: string;
  description: string | null;
  item_type: ItemType;
  language_code: string;
  category: string;
  isbn_or_issn: string | null;
  price_paise: number;
  mrp_paise: number;
  cover_image_url: string;
  sample_pdf_url: string | null;
  digital_file_path: string | null;
  stock_quantity: number;
  is_trending: boolean;
  is_latest_arrival: boolean;
  is_hero_featured: boolean;
  is_published: boolean;
}

export interface ImportIssue {
  /** Spreadsheet line number (header = 1, first data row = 2). */
  row: number;
  field?: string;
  message: string;
}

export interface PreparedImport {
  items: PreparedCatalogItem[];
  /** Spreadsheet row number for each prepared item (same order as `items`). */
  itemRows: number[];
  issues: ImportIssue[];
  missingColumns: ImportColumn[];
  rowCount: number;
}

const ITEM_TYPES: ItemType[] = [
  "physical_book",
  "ebook",
  "magazine_digital",
  "magazine_print",
];

const itemTypeAliases: Record<string, ItemType> = {
  physical_book: "physical_book",
  "physical book": "physical_book",
  physical: "physical_book",
  book: "physical_book",
  paperback: "physical_book",
  hardcover: "physical_book",
  ebook: "ebook",
  "e-book": "ebook",
  "digital book": "ebook",
  digital_book: "ebook",
  magazine_digital: "magazine_digital",
  "digital magazine": "magazine_digital",
  magazine: "magazine_digital",
  "e-magazine": "magazine_digital",
  emagazine: "magazine_digital",
  magazine_print: "magazine_print",
  "print magazine": "magazine_print",
  print: "magazine_print",
};

/** Header aliases so a sheet exported from Excel/Sheets still works. */
const headerAliases: Record<string, ImportColumn> = {
  title: "title",
  book_title: "title",
  title_en: "title_en",
  english_title: "title_en",
  slug: "slug",
  url_slug: "slug",
  subtitle: "subtitle_or_edition",
  subtitle_or_edition: "subtitle_or_edition",
  edition: "subtitle_or_edition",
  author: "author_or_publisher",
  publisher: "author_or_publisher",
  author_or_publisher: "author_or_publisher",
  author_publisher: "author_or_publisher",
  description: "description",
  synopsis: "description",
  item_type: "item_type",
  type: "item_type",
  format: "item_type",
  language_code: "language_code",
  language: "language_code",
  bhasha: "language_code",
  category: "category",
  genre: "category",
  isbn_or_issn: "isbn_or_issn",
  isbn: "isbn_or_issn",
  issn: "isbn_or_issn",
  price_rupees: "price_rupees",
  price: "price_rupees",
  selling_price: "price_rupees",
  mrp_rupees: "mrp_rupees",
  mrp: "mrp_rupees",
  cover_image_url: "cover_image_url",
  cover: "cover_image_url",
  cover_image: "cover_image_url",
  sample_pdf_url: "sample_pdf_url",
  sample: "sample_pdf_url",
  sample_pdf: "sample_pdf_url",
  digital_file_path: "digital_file_path",
  digital_file: "digital_file_path",
  digital: "digital_file_path",
  stock_quantity: "stock_quantity",
  stock: "stock_quantity",
  quantity: "stock_quantity",
  is_trending: "is_trending",
  trending: "is_trending",
  is_latest_arrival: "is_latest_arrival",
  latest: "is_latest_arrival",
  is_hero_featured: "is_hero_featured",
  hero: "is_hero_featured",
  is_published: "is_published",
  published: "is_published",
};

/** RFC 4180-ish parser: handles quotes, escaped quotes, CRLF and BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function csvFromRows(rows: Array<Record<string, string | number | boolean>>): string {
  const lines = [IMPORT_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(
      IMPORT_COLUMNS.map((column) => escapeCsvCell(String(row[column] ?? ""))).join(","),
    );
  }
  return lines.join("\r\n");
}

/**
 * Downloadable template. Slugs end in `-sample` on purpose: importing the
 * sample file as-is can never overwrite a real catalogue row.
 */
export function buildSampleCsv(): string {
  return csvFromRows([
    {
      title: "नमुना पुस्तक",
      title_en: "Sample Physical Book",
      slug: "sample-physical-book",
      subtitle_or_edition: "नमुना आवृत्ती",
      author_or_publisher: "नमुना लेखक",
      description: "ही एक नमुना ओळ आहे. तुमचा खरा डेटा येथे टाका.",
      item_type: "physical_book",
      language_code: "mr",
      category: "fiction",
      isbn_or_issn: "9788123456703",
      price_rupees: 299,
      mrp_rupees: 399,
      cover_image_url: "/covers/placeholder.svg",
      sample_pdf_url: "",
      digital_file_path: "",
      stock_quantity: 25,
      is_trending: "false",
      is_latest_arrival: "true",
      is_hero_featured: "false",
      is_published: "true",
    },
    {
      title: "नमुना ई-पुस्तक",
      title_en: "Sample E-book",
      slug: "sample-ebook",
      subtitle_or_edition: "प्रथम आवृत्ती",
      author_or_publisher: "नमुना प्रकाशक",
      description: "ई-पुस्तकासाठी digital_file_path आवश्यक आहे.",
      item_type: "ebook",
      language_code: "hi",
      category: "self-help",
      isbn_or_issn: "9788123456710",
      price_rupees: 149,
      mrp_rupees: 199,
      cover_image_url: "/covers/placeholder.svg",
      sample_pdf_url: "",
      digital_file_path: "ebooks/sample-ebook.pdf",
      stock_quantity: 0,
      is_trending: "false",
      is_latest_arrival: "false",
      is_hero_featured: "false",
      is_published: "true",
    },
    {
      title: "नमुना संस्कृत पत्रिका",
      title_en: "Sample Sanskrit Magazine",
      slug: "sample-sanskrit-magazine",
      subtitle_or_edition: "द्वितीय अंक",
      author_or_publisher: "नमुना सम्पादक",
      description: "संस्कृत भाषेतील नमुना डिजिटल अंक.",
      item_type: "magazine_digital",
      language_code: "sa",
      category: "special-editions",
      isbn_or_issn: "23456789",
      price_rupees: 49,
      mrp_rupees: 79,
      cover_image_url: "/covers/placeholder.svg",
      sample_pdf_url: "",
      digital_file_path: "magazines/sample-sanskrit.pdf",
      stock_quantity: 0,
      is_trending: "false",
      is_latest_arrival: "false",
      is_hero_featured: "false",
      is_published: "false",
    },
  ]);
}

function clean(value: string | undefined): string {
  return (value ?? "").replace(/^\uFEFF/, "").trim();
}

function parsePrice(value: string): number | null {
  const normalised = value.replace(/[₹,\s]/g, "");
  if (!normalised) return null;
  const parsed = Number(normalised);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}

function parseBoolean(value: string, fallback: boolean): boolean {
  const normalised = value.trim().toLowerCase();
  if (!normalised) return fallback;
  if (["true", "1", "yes", "y", "हो", "हाँ", "हां", "haan", "ha"].includes(normalised)) {
    return true;
  }
  if (["false", "0", "no", "n", "नाही", "नहीं", "nahi", "na"].includes(normalised)) {
    return false;
  }
  return fallback;
}

function buildLanguageLookup(languages: Language[]) {
  const lookup = new Map<string, string>();
  for (const language of languages) {
    for (const label of [
      language.code,
      language.name_en,
      language.name_native,
      language.name_mr,
      language.name_hi,
    ]) {
      if (label) lookup.set(label.trim().toLowerCase(), language.code);
    }
  }
  return lookup;
}

/**
 * Turns raw CSV into validated, database-ready rows.
 * Invalid rows are reported in `issues` and skipped; valid rows still import.
 */
export function prepareImport(csv: string, languages: Language[]): PreparedImport {
  const table = parseCsv(csv);
  const issues: ImportIssue[] = [];

  if (table.length === 0) {
    return {
      items: [],
      itemRows: [],
      issues: [{ row: 1, message: "Empty file." }],
      missingColumns: [],
      rowCount: 0,
    };
  }

  const headerRow = table[0].map((cell) => clean(cell).toLowerCase().replace(/\s+/g, "_"));
  const columnIndex = new Map<ImportColumn, number>();
  headerRow.forEach((header, index) => {
    const mapped = headerAliases[header] ?? (header as ImportColumn);
    if ((IMPORT_COLUMNS as readonly string[]).includes(mapped) && !columnIndex.has(mapped)) {
      columnIndex.set(mapped, index);
    }
  });

  const missingColumns = REQUIRED_COLUMNS.filter((column) => !columnIndex.has(column));
  if (missingColumns.length > 0) {
    return {
      items: [],
      itemRows: [],
      issues: [
        {
          row: 1,
          message: `Missing required column(s): ${missingColumns.join(", ")}`,
        },
      ],
      missingColumns,
      rowCount: 0,
    };
  }

  const languageLookup = buildLanguageLookup(languages);
  const items: PreparedCatalogItem[] = [];
  const itemRows: number[] = [];
  const usedSlugs = new Set<string>();
  const dataRows = table.slice(1).filter((cells) => cells.some((cell) => clean(cell) !== ""));

  if (dataRows.length > MAX_IMPORT_ROWS) {
    issues.push({
      row: MAX_IMPORT_ROWS + 2,
      message: `Only the first ${MAX_IMPORT_ROWS} rows are imported. Split the file and upload again.`,
    });
    dataRows.length = MAX_IMPORT_ROWS;
  }

  dataRows.forEach((cells, index) => {
    const line = index + 2;
    const value = (column: ImportColumn) => {
      const position = columnIndex.get(column);
      return position === undefined ? "" : clean(cells[position]);
    };

    const rowIssues: string[] = [];

    const title = value("title");
    if (!title) rowIssues.push("title is required");

    const author = value("author_or_publisher");
    if (!author) rowIssues.push("author_or_publisher is required");

    const rawType = value("item_type").toLowerCase();
    const itemType = itemTypeAliases[rawType];
    if (!itemType) {
      rowIssues.push(
        `item_type must be one of ${ITEM_TYPES.join(", ")} (got "${value("item_type")}")`,
      );
    }

    const rawLanguage = value("language_code").toLowerCase();
    const languageCode = languageLookup.get(rawLanguage);
    if (!languageCode) {
      rowIssues.push(
        `language_code "${value("language_code")}" is not an active bhasha (use ${languages
          .map((language) => language.code)
          .join(", ")})`,
      );
    }

    const category = value("category").toLowerCase().replace(/\s+/g, "-");
    if (!category) rowIssues.push("category is required");

    const price = parsePrice(value("price_rupees"));
    if (price === null || price <= 0) rowIssues.push("price_rupees must be greater than 0");

    const mrpValue = parsePrice(value("mrp_rupees"));
    const mrp = mrpValue === null ? price : mrpValue;
    if (price !== null && mrp !== null && price > mrp) {
      rowIssues.push("price_rupees cannot be greater than mrp_rupees");
    }

    const cover = value("cover_image_url");
    if (!cover) rowIssues.push("cover_image_url is required");

    const digitalFile = value("digital_file_path");
    const physical = itemType === "physical_book" || itemType === "magazine_print";

    if (rowIssues.length > 0 || !itemType || !languageCode || price === null || !mrp) {
      for (const message of rowIssues) {
        issues.push({ row: line, message });
      }
      return;
    }

    const baseSlug =
      slugify(value("slug")) || slugify(value("title_en")) || slugify(title) || `item-${line}`;
    let slug = baseSlug;
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(slug);

    const stock = Math.max(0, Math.round(Number(value("stock_quantity").replace(/[,\s]/g, "")) || 0));

    items.push({
      title,
      title_en: value("title_en") || null,
      slug,
      subtitle_or_edition: value("subtitle_or_edition") || null,
      author_or_publisher: author,
      description: value("description") || null,
      item_type: itemType,
      language_code: languageCode,
      category,
      isbn_or_issn: value("isbn_or_issn") || null,
      price_paise: Math.round(price * 100),
      mrp_paise: Math.round(mrp * 100),
      cover_image_url: cover,
      sample_pdf_url: value("sample_pdf_url") || null,
      digital_file_path: physical ? null : digitalFile || null,
      stock_quantity: physical ? stock : 0,
      is_trending: parseBoolean(value("is_trending"), false),
      is_latest_arrival: parseBoolean(value("is_latest_arrival"), false),
      is_hero_featured: parseBoolean(value("is_hero_featured"), false),
      is_published: parseBoolean(value("is_published"), true),
    });
    itemRows.push(line);
  });

  return { items, itemRows, issues, missingColumns, rowCount: dataRows.length };
}
