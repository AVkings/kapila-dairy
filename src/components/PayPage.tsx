/* ── Kapila Dairy · hosted pay page (counter QR → exact-amount pay) ── */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { getPayOrder, confirmOnlinePayment, type PayOrder } from "../lib/supabase";
import { payWithRazorpay } from "../lib/razorpay";
import { inr } from "../lib/data";

const CONFETTI_COLORS = ["#FF9933", "#FFD700", "#FFFEF0", "#E2670A"];

function DiyaMark({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <path d="M24 4C24 4 9 21.5 9 30.5a15 15 0 0 0 30 0C39 21.5 24 4 24 4Z" fill="#FF9933" />
      <path d="M24 15c0 0-8.5 10-8.5 16a8.5 8.5 0 0 0 17 0C32.5 25 24 15 24 15Z" fill="#FFFEF0" />
      <circle cx="24" cy="32" r="3.4" fill="#E2670A" />
    </svg>
  );
}

export default function PayPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<PayOrder | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "paying" | "done" | "error">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      const o = await getPayOrder(orderId);
      if (!alive) return;
      if (!o) {
        setState("error");
        return;
      }
      setOrder(o);
      setState(o.paid ? "done" : "ready");
    })();
    return () => {
      alive = false;
    };
  }, [orderId]);

  const pay = async () => {
    if (!order) return;
    setState("paying");
    const res = await payWithRazorpay({
      amount: order.total,
      orderId: order.order_id,
      name: order.customer_name,
      phone: order.phone.replace(/\D/g, "").slice(-10),
    });
    if (!res.ok || !res.paymentId) {
      setState("ready");
      return;
    }
    await confirmOnlinePayment(order.order_id, res.paymentId);
    setOrder({ ...order, paid: true, payment: "online" });
    setState("done");
    confetti({
      particleCount: 90,
      spread: 85,
      startVelocity: 40,
      origin: { x: 0.5, y: 0.38 },
      colors: CONFETTI_COLORS,
    });
  };

  return (
    <div className="min-h-screen bg-cream flex items-start justify-center px-4 py-10 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md bg-white rounded-[1.8rem] shadow-lift border border-gold/40 overflow-hidden"
      >
        {/* header */}
        <div className="bg-espresso-deep text-cream px-6 py-6 flex items-center gap-3.5 relative overflow-hidden">
          <div className="absolute -top-12 -right-10 w-40 h-40 rounded-full bg-saffron/20 blur-2xl" />
          <DiyaMark className="w-11 h-11 shrink-0" />
          <div>
            <p className="font-display font-black text-2xl leading-none">Kapila Dairy</p>
            <p className="font-hand text-xl text-gold mt-0.5">counter payment · safe & pakka</p>
          </div>
        </div>

        <div className="p-6 sm:p-7">
          {state === "loading" && (
            <div className="py-14 flex flex-col items-center gap-3 text-espresso/60">
              <Loader2 className="animate-spin text-saffron-deep" size={30} />
              <p className="font-semibold text-sm">Order dhundh rahe hain…</p>
            </div>
          )}

          {state === "error" && (
            <div className="py-10 text-center">
              <p className="font-display font-black text-3xl text-espresso">Order nahi mila!</p>
              <p className="text-sm font-semibold text-espresso/60 mt-2">
                ID <b className="text-saffron-deep">{orderId}</b> galat lag rahi hai — counter pe
                dobara QR dikhao.
              </p>
            </div>
          )}

          {order && state !== "loading" && state !== "error" && (
            <>
              {/* amount */}
              <div className="text-center">
                <p className="text-[11px] font-bold tracking-[0.28em] text-espresso/50">BHARNA HAI</p>
                <motion.p
                  key={String(order.paid)}
                  initial={{ scale: 0.85, opacity: 0.4 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-display font-black text-6xl text-espresso mt-1"
                >
                  {inr(order.total)}
                </motion.p>
                <p className="font-hand text-2xl text-saffron-deep mt-1">
                  {order.paid ? "paisa mil gaya — shukriya!" : "exact amount — ek rupya kam nahi"}
                </p>
              </div>

              {/* order meta */}
              <div className="mt-5 bg-parchment/70 rounded-2xl p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-espresso/55">Order</span>
                  <span className="font-mono font-bold text-espresso">{order.order_id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-espresso/55">Naam</span>
                  <span className="font-semibold text-espresso">{order.customer_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-espresso/55">Pickup</span>
                  <span className="font-semibold text-espresso">{order.pickup ?? "—"}</span>
                </div>
              </div>

              {/* items */}
              <ul className="mt-4 divide-y divide-espresso/8">
                {order.items.map((i, idx) => (
                  <li key={idx} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="font-semibold text-espresso/85">
                      {i.name} <span className="text-espresso/45">× {i.qty}</span>
                      <span className="block text-[11px] font-semibold text-espresso/45">{i.pack}</span>
                    </span>
                    <span className="font-display font-bold text-espresso">
                      {inr(i.price * i.qty)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* actions */}
              {state === "done" || order.paid ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mt-6 bg-leaf/10 border-[1.5px] border-leaf/50 rounded-2xl p-5 text-center"
                >
                  <CheckCircle2 size={38} className="text-leaf mx-auto" />
                  <p className="font-display font-black text-2xl text-espresso mt-2">PAID — Pakka!</p>
                  <p className="text-[13px] font-semibold text-espresso/65 mt-1">
                    Counter pe screen dikhao aur apna thaila uthao. Dhanyavaad!
                  </p>
                </motion.div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={pay}
                  disabled={state === "paying"}
                  className="mt-6 w-full h-14 rounded-2xl bg-saffron-deep text-cream font-bold text-[15px] flex items-center justify-center gap-2.5 hover:bg-espresso transition-colors shadow-lift disabled:opacity-60"
                >
                  {state === "paying" ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Razorpay khul raha hai…
                    </>
                  ) : (
                    <>
                      <Smartphone size={18} /> Pay {inr(order.total)} — Razorpay se
                    </>
                  )}
                </motion.button>
              )}

              <p className="text-center text-[11px] font-semibold text-espresso/45 mt-3.5">
                UPI · Card · Netbanking — payment hote hi counter ko turant pata chal jayega
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
