import { NextResponse } from "next/server";
import {
  MAX_IMPORT_ROWS,
  prepareImport,
  type ImportIssue,
} from "@/lib/catalog-import";
import { getCurrentProfile, getSupabaseAdmin } from "@/lib/supabase/server";
import type { Language } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CSV_BYTES = 5 * 1024 * 1024;
const BATCH_SIZE = 100;

/**
 * Bulk catalogue import. Accepts the CSV text produced/parsed by the admin
 * upload modal, re-validates it server-side, then upserts in batches.
 *
 * Matching is on `catalog_items.slug` (unique), so re-uploading the same file
 * updates rows instead of duplicating them — and existing order/library rows
 * keep their foreign keys.
 */
export async function POST(request: Request) {
  const { user, profile } = await getCurrentProfile();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }

  let csv = "";
  try {
    const body = (await request.json()) as { csv?: unknown };
    if (typeof body.csv !== "string") throw new Error("csv missing");
    csv = body.csv;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (!csv.trim()) {
    return NextResponse.json({ error: "EMPTY_FILE" }, { status: 400 });
  }
  if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  }

  const { data: languageRows, error: languageError } = await admin
    .from("languages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (languageError) {
    return NextResponse.json(
      { error: "LANGUAGES_UNAVAILABLE", message: languageError.message },
      { status: 500 },
    );
  }

  const prepared = prepareImport(csv, (languageRows ?? []) as Language[]);
  if (prepared.rowCount === 0 && prepared.items.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "NOTHING_TO_IMPORT",
        rows: 0,
        imported: 0,
        created: 0,
        updated: 0,
        issueCount: prepared.issues.length,
        issues: prepared.issues.slice(0, 200),
      },
      { status: 400 },
    );
  }

  const issues: ImportIssue[] = [...prepared.issues];
  const succeeded = new Set<string>();
  let imported = 0;

  for (let start = 0; start < prepared.items.length; start += BATCH_SIZE) {
    const batch = prepared.items.slice(start, start + BATCH_SIZE);
    const { data, error } = await admin
      .from("catalog_items")
      .upsert(batch, { onConflict: "slug" })
      .select("slug");

    if (error) {
      console.error("[admin/import] batch failed:", error.message);
      const rows = prepared.itemRows.slice(start, start + batch.length);
      for (const row of rows) {
        issues.push({ row, message: error.message });
      }
      continue;
    }

    const written = (data ?? []) as Array<{ slug: string }>;
    for (const row of written) succeeded.add(row.slug);
    imported += written.length;
  }

  // Distinguish inserts from updates by checking which slugs already existed.
  let updated = 0;
  const succeededSlugs = [...succeeded];
  for (let start = 0; start < succeededSlugs.length; start += 200) {
    const slice = succeededSlugs.slice(start, start + 200);
    const { data, error } = await admin
      .from("catalog_items")
      .select("slug, created_at")
      .in("slug", slice);
    if (error) continue;
    const justCreated = new Set(
      (data ?? [])
        .filter((row) => Date.now() - +new Date(String(row.created_at)) < 120_000)
        .map((row) => String(row.slug)),
    );
    updated += slice.filter((slug) => !justCreated.has(slug)).length;
  }

  return NextResponse.json({
    ok: true,
    rows: Math.min(prepared.rowCount, MAX_IMPORT_ROWS),
    imported,
    created: imported - updated,
    updated,
    issueCount: issues.length,
    issues: issues.slice(0, 200),
  });
}
