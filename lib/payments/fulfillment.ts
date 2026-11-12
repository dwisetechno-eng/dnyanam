import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface FulfillmentResult {
  fulfilled: boolean;
  alreadyFulfilled: boolean;
}

/**
 * Idempotently fulfils a paid order. All the locking, library unlocks and
 * stock decrements happen inside a single Postgres transaction
 * (public.fulfill_paid_order) called with the service-role client.
 */
export async function fulfillOrder(
  razorpayOrderId: string,
  razorpayPaymentId?: string | null,
): Promise<FulfillmentResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const { data, error } = await admin.rpc("fulfill_paid_order", {
    p_razorpay_order_id: razorpayOrderId,
    p_razorpay_payment_id: razorpayPaymentId ?? null,
  });

  if (error) {
    throw new Error(`Order fulfilment failed: ${error.message}`);
  }

  const fulfilled = data === true;
  return { fulfilled, alreadyFulfilled: !fulfilled };
}
