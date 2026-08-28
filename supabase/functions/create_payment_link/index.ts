// Kapila Dairy · create a Razorpay Payment Link (exact amount)
// Deploy:  supabase functions deploy create_payment_link --no-verify-jwt
// Secrets: supabase secrets set RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... SITE_URL=...
// Call from admin panel:  supabase.functions.invoke("create_payment_link", { body: { order_id, amount_paise, note } })
Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { order_id, amount_paise, note } = await req.json();
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const siteUrl = Deno.env.get("SITE_URL") ?? "";
    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: "Razorpay secrets missing" }), { status: 500, headers: cors });
    }

    const res = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount_paise,
        currency: "INR",
        description: `Kapila Dairy order ${order_id}`,
        notes: { order_id },
        reminder_enable: true,
        callback_url: `${siteUrl}/#/pay/${order_id}`,
        callback_method: "get",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.error?.description ?? "Razorpay error" }), { status: 502, headers: cors });
    }
    return new Response(JSON.stringify({ url: data.short_url, id: data.id }), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
