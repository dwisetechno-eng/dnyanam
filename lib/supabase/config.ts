function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

export const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnonKey =
  clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  // Supabase now issues "publishable" keys (sb_publishable_…) that replace the
  // legacy anon key. Both are safe to expose to the browser.
  clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export const supabaseServiceRoleKey =
  clean(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
  // New-style "secret" keys (sb_secret_…) replace the legacy service-role JWT.
  clean(process.env.SUPABASE_SECRET_KEY);

export const isSupabaseConfigured = Boolean(
  supabaseUrl.startsWith("http") &&
    supabaseAnonKey.length > 20 &&
    !supabaseUrl.includes("your-project"),
);

export const hasServiceRole = Boolean(
  isSupabaseConfigured && supabaseServiceRoleKey.length > 20,
);

export const isRazorpayConfigured = Boolean(
  clean(process.env.RAZORPAY_KEY_ID) &&
    clean(process.env.RAZORPAY_KEY_SECRET),
);

export const siteUrl =
  clean(process.env.NEXT_PUBLIC_SITE_URL) || "http://localhost:3000";
