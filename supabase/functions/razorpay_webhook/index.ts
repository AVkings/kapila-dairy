// Kapila Dairy · Razorpay webhook → mark order PAID (server-side, verified)
// 1. Razorpay Dashboard → Settings → Webhooks → add:
//      https://<project-ref>.supabase.co/functions/v1/razorpay_webhook
//    events: payment.captured, payment_link.paid
// 2. supabase secrets set RAZORPAY_WEBHOOK_SECRET=<secret from dashboard> SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_URL=...
// 3. supabase functions deploy razorpay_webhook --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";

  // HMAC-SHA256 verify
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const verified = expected === signature;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let event = "";
  let orderId: string | null = null;
  let paymentId: string | null = null;

  try {
    const body = JSON.parse(raw);
    event = body.event ?? "";
    const payload = body.payload ?? {};
    const p = payload.payment?.entity ?? payload.payment_link?.entity ?? {};
    paymentId = p.id ?? null;
    orderId = p.notes?.order_id ?? p.notes?.shop_order_id ?? null;

    if (verified && orderId && ["payment.captured", "payment_link.paid"].includes(event)) {
      await sb.rpc("admin_mark_paid", { p_order_id: orderId, p_payment_id: paymentId });
    }
  } catch {
    /* log anyway */
  }

  await sb.from("razorpay_webhook_log").insert({
    event,
    payload: JSON.parse(raw || "{}"),
    verified,
  }).catch(() => undefined);

  return new Response(JSON.stringify({ ok: true, verified }), { headers: { "Content-Type": "application/json" } });
});
