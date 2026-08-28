/* ── Kapila Dairy · Razorpay checkout wrapper ──────────────────────── */

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: () => void) => void;
    };
  }
}

export const RAZORPAY_KEY = (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined) ?? "";

export interface RazorpayResult {
  ok: boolean;
  paymentId?: string;
  reason?: string;
}

/** Opens Razorpay Standard Checkout (desktop shows QR, mobile shows UPI/apps). Resolves, never throws. */
export function payWithRazorpay(opts: {
  amount: number; // rupees
  orderId: string;
  name: string;
  phone: string;
}): Promise<RazorpayResult> {
  return new Promise((resolve) => {
    if (!RAZORPAY_KEY) { resolve({ ok: false, reason: "no-key" }); return; }
    if (typeof window.Razorpay !== "function") { resolve({ ok: false, reason: "sdk-not-loaded" }); return; }
    try {
      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY,
        amount: Math.round(opts.amount * 100), // paise
        currency: "INR",
        name: "Kapila Dairy",
        description: `Order ${opts.orderId}`,
        prefill: { name: opts.name, contact: opts.phone.replace(/\D/g, "").slice(-10) },
        notes: { shop_order_id: opts.orderId, order_id: opts.orderId },
        theme: { color: "#FF9933", backdrop_color: "rgba(36,20,16,0.72)" },
        modal: { ondismiss: () => resolve({ ok: false, reason: "dismissed" }) },
        handler: (res: { razorpay_payment_id: string }) =>
          resolve({ ok: true, paymentId: res.razorpay_payment_id }),
      });
      rzp.on("payment.failed", () => resolve({ ok: false, reason: "failed" }));
      rzp.open();
    } catch {
      resolve({ ok: false, reason: "error" });
    }
  });
}
