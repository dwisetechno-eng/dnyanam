import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, getCurrentUser, getSupabaseServerClient } from "@/lib/supabase/server";
import {
  isRazorpayConfigured,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { getRazorpayClient, getRazorpayKeyId } from "@/lib/payments/razorpay";
import type { CatalogItem, PaymentErrorCode } from "@/lib/types";
import {
  FREE_SHIPPING_THRESHOLD_PAISE,
  SHIPPING_FEE_PAISE,
  isPhysical,
} from "@/lib/utils";

export const runtime = "nodejs";

const lineSchema = z.object({
  id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(10),
});

const addressSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/),
  address: z.string().trim().min(8).max(500),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^\d{6}$/),
});

const bodySchema = z.object({
  items: z.array(lineSchema).min(1).max(40),
  shippingAddress: addressSchema.optional().nullable(),
});

function fail(
  code: PaymentErrorCode,
  status: number,
  message: string,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json(
    { error: code, message, code, ...extra },
    { status },
  );
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return fail(
      "DEMO_MODE",
      503,
      "Supabase is not configured. This is a demo storefront.",
      { demo: true },
    );
  }

  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return fail("UNAUTHENTICATED", 401, "Please sign in to continue.");
  }

  if (!isRazorpayConfigured) {
    return fail(
      "RAZORPAY_NOT_CONFIGURED",
      503,
      "Razorpay is not configured on this deployment.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("INVALID_CART", 400, "Invalid request body.");
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const code: PaymentErrorCode =
      issue?.path?.[0] === "shippingAddress" ? "ADDRESS_REQUIRED" : "INVALID_CART";
    return fail(code, 400, issue?.message ?? "Invalid cart.");
  }

  // Merge duplicate lines and clamp quantities.
  const merged = new Map<string, number>();
  for (const line of parsed.data.items) {
    const next = Math.min(10, (merged.get(line.id) ?? 0) + line.quantity);
    merged.set(line.id, next);
  }
  const ids = Array.from(merged.keys());

  const db = getSupabaseAdmin() ?? supabase;
  const { data: rows, error: catalogError } = await db
    .from("catalog_items")
    .select("*")
    .in("id", ids)
    .eq("is_published", true);

  if (catalogError) {
    console.error("[checkout] catalog lookup failed:", catalogError.message);
    return fail("GENERIC", 500, "Could not load catalogue items.");
  }

  const catalog = (rows ?? []) as CatalogItem[];
  if (catalog.length !== ids.length) {
    return fail("ITEM_UNAVAILABLE", 400, "One or more items are unavailable.");
  }

  let subtotalPaise = 0;
  let hasPhysicalItems = false;

  for (const item of catalog) {
    const quantity = merged.get(item.id) ?? 0;
    if (quantity < 1) {
      return fail("INVALID_CART", 400, "Invalid quantity.");
    }
    if (isPhysical(item) && item.stock_quantity < quantity) {
      return fail(
        "OUT_OF_STOCK",
        409,
        `Only ${item.stock_quantity} copies of ${item.title} are available.`,
      );
    }
    if (isPhysical(item)) hasPhysicalItems = true;
    subtotalPaise += item.price_paise * quantity;
  }

  if (subtotalPaise < 100) {
    return fail("INVALID_CART", 400, "Order total is too small.");
  }

  const shippingAddress = hasPhysicalItems
    ? parsed.data.shippingAddress
    : null;

  if (hasPhysicalItems && !shippingAddress) {
    return fail(
      "ADDRESS_REQUIRED",
      400,
      "A delivery address is required for physical books.",
    );
  }

  const shippingPaise = hasPhysicalItems
    ? subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE
      ? 0
      : SHIPPING_FEE_PAISE
    : 0;
  const totalPaise = subtotalPaise + shippingPaise;

  const internalOrderId = crypto.randomUUID();
  const razorpay = getRazorpayClient();
  if (!razorpay) {
    return fail("RAZORPAY_NOT_CONFIGURED", 503, "Razorpay is not configured.");
  }

  let razorpayOrder: { id: string };
  try {
    razorpayOrder = (await razorpay.orders.create({
      amount: totalPaise,
      currency: "INR",
      receipt: `dn_${internalOrderId.replace(/-/g, "").slice(0, 28)}`,
      notes: {
        internal_order_id: internalOrderId,
        user_id: user.id,
      },
    })) as { id: string };
  } catch (error) {
    console.error("[checkout] Razorpay order creation failed:", error);
    return fail("GENERIC", 502, "Payment gateway is unavailable.");
  }

  const { error: orderError } = await db.from("orders").insert({
    id: internalOrderId,
    user_id: user.id,
    razorpay_order_id: razorpayOrder.id,
    status: "created",
    subtotal_paise: subtotalPaise,
    shipping_paise: shippingPaise,
    total_paise: totalPaise,
    shipping_address: shippingAddress,
  });

  if (orderError) {
    console.error("[checkout] order insert failed:", orderError.message);
    return fail("GENERIC", 500, "Could not create the order.");
  }

  const orderItems = catalog.map((item) => ({
    order_id: internalOrderId,
    catalog_item_id: item.id,
    quantity: merged.get(item.id) ?? 1,
    unit_price_paise: item.price_paise,
  }));

  const { error: itemsError } = await db.from("order_items").insert(orderItems);
  if (itemsError) {
    console.error("[checkout] order items insert failed:", itemsError.message);
    await db.from("orders").delete().eq("id", internalOrderId);
    return fail("GENERIC", 500, "Could not create the order.");
  }

  return NextResponse.json(
    {
      orderId: internalOrderId,
      razorpayOrderId: razorpayOrder.id,
      amount: totalPaise,
      currency: "INR",
      keyId: getRazorpayKeyId(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
