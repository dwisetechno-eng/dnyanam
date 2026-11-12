import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, getSupabaseAdmin } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

const uuidSchema = z.string().uuid();

interface LibraryRow {
  catalog_item_id: string;
  catalog_items:
    | {
        title: string;
        digital_file_path: string | null;
      }
    | null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;

  if (!uuidSchema.safeParse(itemId).success) {
    return NextResponse.json({ error: "INVALID_ITEM" }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "DEMO_MODE" }, { status: 503 });
  }

  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_library")
    .select("catalog_item_id, catalog_items(title, digital_file_path)")
    .eq("user_id", user.id)
    .eq("catalog_item_id", itemId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "NOT_OWNED" }, { status: 403 });
  }

  const row = data as unknown as LibraryRow;
  const path = row.catalog_items?.digital_file_path;
  if (!path) {
    return NextResponse.json({ error: "FILE_MISSING" }, { status: 404 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_MISSING" },
      { status: 503 },
    );
  }

  const extension = path.split(".").pop()?.toLowerCase() || "pdf";
  const title = (row.catalog_items?.title ?? "dnyanam")
    .replace(/[\\/:*?"<>|]+/g, "")
    .trim();

  const { data: signed, error: signError } = await admin.storage
    .from("digital_assets")
    .createSignedUrl(path, 60, { download: `${title}.${extension}` });

  if (signError || !signed?.signedUrl) {
    console.error("[download] signed URL failed:", signError?.message);
    return NextResponse.json({ error: "SIGN_FAILED" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
