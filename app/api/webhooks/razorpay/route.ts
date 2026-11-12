import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { fulfillOrder } from "@/lib/payments/fulfillment";

export const runtime = "nodejs";

interface RazorpayWebhookBody {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
      };
    };
    order?: {
      entity?: {
        id?: string;
        status?: string;
      };
    };
  };
}

export async function POST(request: Request) {
  // IMPORTANT: read the raw body BEFORE parsing. Signature is over raw bytes.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[webhook] invalid Razorpay signature");
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let payload: RazorpayWebhookBody;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookBody;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const eventType = payload.event ?? "unknown";
  const eventId = request.headers.get("x-razorpay-event-id");

  if (!eventId) {
    return NextResponse.json(
      { error: "MISSING_EVENT_ID" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error("[webhook] service role key is not configured");
    return NextResponse.json(
      { error: "SUPABASE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  // Claim the event. A duplicate primary key means it was already processed.
  const { error: ledgerError } = await admin.from("webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
  });

  if (ledgerError) {
    if (ledgerError.code === "23505") {
      return NextResponse.json({ status: "already_processed" });
    }
    console.error("[webhook] ledger insert failed:", ledgerError.message);
    return NextResponse.json({ error: "LEDGER_FAILED" }, { status: 500 });
  }

  try {
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const orderId =
        payload.payload?.payment?.entity?.order_id ??
        payload.payload?.order?.entity?.id;
      const paymentId = payload.payload?.payment?.entity?.id ?? null;

      if (!orderId) {
        console.warn(`[webhook] ${eventType} missing order id`);
        return NextResponse.json({ status: "ignored" });
      }

      await fulfillOrder(orderId, paymentId);
      console.info(
        `[webhook] fulfilled order ${orderId} (event ${eventType}, id ${eventId})`,
      );
    } else if (eventType === "payment.failed") {
      const orderId = payload.payload?.payment?.entity?.order_id;
      if (orderId) {
        await admin
          .from("orders")
          .update({ status: "failed" })
          .eq("razorpay_order_id", orderId)
          .eq("status", "created");
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    // Release the idempotency claim so Razorpay can retry after a transient
    // database or fulfilment failure.
    await admin.from("webhook_events").delete().eq("event_id", eventId);
    console.error("[webhook] processing failed:", error);
    return NextResponse.json({ error: "PROCESSING_FAILED" }, { status: 500 });
  }
}
