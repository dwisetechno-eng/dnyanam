export {};

declare global {
  interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  interface RazorpayFailureResponse {
    error?: {
      code?: string;
      description?: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    };
  }

  interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    image?: string;
    order_id: string;
    handler: (response: RazorpaySuccessResponse) => void;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    notes?: Record<string, string>;
    theme?: {
      color?: string;
      backdrop_color?: string;
    };
    modal?: {
      ondismiss?: () => void;
      escape?: boolean;
      confirm_close?: boolean;
      backdropclose?: boolean;
    };
  }

  interface RazorpayInstance {
    open: () => void;
    close: () => void;
    on: (
      event: "payment.failed",
      handler: (response: RazorpayFailureResponse) => void,
    ) => void;
  }

  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
