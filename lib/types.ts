export type Locale = "mr" | "hi" | "en";

export type ItemType =
  | "physical_book"
  | "ebook"
  | "magazine_digital"
  | "magazine_print";

export type OrderStatus = "created" | "paid" | "failed" | "refunded";

export interface Language {
  code: string;
  name_mr: string;
  name_hi: string;
  name_en: string;
  name_native: string;
  is_active: boolean;
  sort_order: number;
}

export interface CatalogItem {
  id: string;
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
  created_at: string;
}

export type BannerSlot = "hero_carousel" | "mid_feed_1" | "mid_feed_2";

export interface AdBanner {
  id: string;
  title: string;
  slot_position: BannerSlot;
  desktop_image_url: string;
  mobile_image_url: string;
  target_url: string;
  language_code: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  priority: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "customer" | "admin";
  ui_language: Locale;
  preferred_content_language: string | null;
  created_at: string;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface CartLine {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover: string;
  pricePaise: number;
  mrpPaise: number;
  itemType: ItemType;
  languageCode: string;
  quantity: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  catalog_item_id: string;
  quantity: number;
  unit_price_paise: number;
  catalog_items?: CatalogItem | null;
}

export interface Order {
  id: string;
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  status: OrderStatus;
  subtotal_paise: number;
  shipping_paise: number;
  total_paise: number;
  shipping_address: ShippingAddress | null;
  created_at: string;
  paid_at: string | null;
  order_items?: OrderItem[];
  profiles?: Pick<Profile, "full_name" | "phone"> | null;
}

export interface LibraryEntry {
  id: string;
  user_id: string;
  catalog_item_id: string;
  order_id: string;
  unlocked_at: string;
  catalog_items: CatalogItem | null;
}

export interface DemoLibraryEntry {
  id: string;
  unlocked_at: string;
  order_id: string;
  item: CatalogItem;
}

export interface Storefront {
  heroItems: CatalogItem[];
  trending: CatalogItem[];
  latest: CatalogItem[];
  magazines: CatalogItem[];
  ebooks: CatalogItem[];
  banners: AdBanner[];
  languages: Language[];
  source: "supabase" | "demo";
}

export interface CatalogFilters {
  language?: string;
  type?: "all" | "physical" | "ebook" | "magazines";
  collection?:
    | "all"
    | "trending"
    | "latest"
    | "magazines"
    | "ebooks"
    | "physical";
  query?: string;
  sort?: "newest" | "price-low" | "price-high" | "trending";
}

export type PaymentErrorCode =
  | "UNAUTHENTICATED"
  | "DEMO_MODE"
  | "RAZORPAY_NOT_CONFIGURED"
  | "SUPABASE_NOT_CONFIGURED"
  | "INVALID_CART"
  | "ITEM_UNAVAILABLE"
  | "OUT_OF_STOCK"
  | "ADDRESS_REQUIRED"
  | "INVALID_SIGNATURE"
  | "ORDER_NOT_FOUND"
  | "GENERIC";
