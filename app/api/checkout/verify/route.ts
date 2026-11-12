import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { verifyPaymentSignature } from "@/lib/payments/razorpay";
import { fulfillOrder } from "@/lib/payments/fulfillment";

export const runtime = "nodejs";

const bodySchema = z.object({
  razorpay_order_id: z.string().min(4),
  razorpay_payment_id: z.string().min(4),
  razorpay_signature: z.string().min(16),
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "DEMO_MODE", code: "DEMO_MODE" },
      { status: 503 },
    );
  }

  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED", code: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_REQUEST", code: "GENERIC" },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", code: "GENERIC" },
      { status: 400 },
    );
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    parsed.data;

  // Ensure this payment belongs to the signed-in customer before doing
  // anything with the service role.
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, status, user_id")
    .eq("razorpay_order_id", razorpay_order_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json(
      { error: "ORDER_NOT_FOUND", code: "ORDER_NOT_FOUND" },
      { status: 404 },
    );
  }

  const validSignature = verifyPaymentSignature({
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!validSignature) {
    return NextResponse.json(
      { error: "INVALID_SIGNATURE", code: "INVALID_SIGNATURE" },
      { status: 400 },
    );
  }

  if (order.status === "paid") {
    return NextResponse.json({ success: true, alreadyFulfilled: true });
  }

  try {
    const result = await fulfillOrder(razorpay_order_id, razorpay_payment_id);
    return NextResponse.json({
      success: true,
      alreadyFulfilled: result.alreadyFulfilled,
    });
  } catch (fulfillError) {
    console.error("[checkout/verify] fulfilment failed:", fulfillError);
    return NextResponse.json(
      { error: "FULFILMENT_FAILED", code: "GENERIC" },
      { status: 500 },
    );
  }
}
