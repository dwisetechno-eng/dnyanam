import "server-only";

import crypto from "node:crypto";
import Razorpay from "razorpay";
import { isRazorpayConfigured } from "@/lib/supabase/config";

function credentials() {
  const keyId = (process.env.RAZORPAY_KEY_ID ?? "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET ?? "").trim();
  return { keyId, keySecret };
}

export function getRazorpayKeyId(): string {
  return credentials().keyId;
}

export function getRazorpayClient(): Razorpay | null {
  if (!isRazorpayConfigured) return null;
  const { keyId, keySecret } = credentials();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function safeEqualHex(expectedHex: string, providedHex: string): boolean {
  try {
    const expected = Buffer.from(expectedHex, "utf8");
    const provided = Buffer.from(providedHex, "utf8");
    if (expected.length !== provided.length) return false;
    return crypto.timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}

/** Verify Razorpay's checkout signature: HMAC_SHA256(order_id|payment_id). */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = credentials();
  if (!keySecret) return false;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");
  return safeEqualHex(expected, params.signature);
}

/** Verify the raw webhook body against the x-razorpay-signature header. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET ?? "").trim();
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return safeEqualHex(expected, signature);
}
