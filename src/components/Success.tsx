/* ── Kapila Dairy · order success · QR · loyalty celebration ───────── */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import QRCode from "react-qr-code";
import { animate } from "animejs";
import confetti from "canvas-confetti";
import { ArrowRight, RefreshCw, ScanLine, ShoppingBag, Smartphone, Sparkles, User } from "lucide-react";
import { payWithRazorpay } from "../lib/razorpay";
import { confirmOnlinePayment } from "../lib/supabase";
import { useStore } from "../lib/store";
import {
  inr,
  orderQRPayload,
  QR_EXPIRY_MS,
  REWARD_TIERS,
  type Order,
} from "../lib/data";
import { RollCounter, SugarParticles } from "./MotionBits";
import { scrollToId } from "../lib/scroll";

const R = 118;
const CIRC = 2 * Math.PI * R;
const CONFETTI_COLORS = ["#FF9933", "#FFD700", "#FFFEF0", "#E2670A"];

function QRCard({ order }: { order: Order }) {
  const ringRef = useRef<SVGCircleElement>(null);
  const startRef = useRef(Date.now());
  const [remain, setRemain] = useState(QR_EXPIRY_MS);
  const [gen, setGen] = useState(0);

  useEffect(() => {
    startRef.current = Date.now();
    setRemain(QR_EXPIRY_MS);
    if (ringRef.current) {
      animate(ringRef.current, {
        strokeDashoffset: [0, CIRC],
        duration: QR_EXPIRY_MS,
        ease: "linear",
      });
    }
    const iv = window.setInterval(() => {
      const left = QR_EXPIRY_MS - (Date.now() - startRef.current);
      setRemain(Math.max(0, left));
      if (left <= 0) window.clearInterval(iv);
    }, 1000);
    return () => window.clearInterval(iv);
  }, [gen]);

  const frac = remain / QR_EXPIRY_MS;
  const ringColor = frac > 0.5 ? "#2F7D3B" : frac > 0.2 ? "#C9971C" : "#C62828";
  const mm = Math.floor(remain / 60000);
  const ss = Math.floor((remain % 60000) / 1000);

  return (
    <motion.div
      initial={{ scale: 0, rotate: -8 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 210, damping: 15, delay: 0.4 }}
      className="bg-white rounded-[2rem] p-7 sm:p-8 shadow-lift border border-gold/40"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-display font-black text-2xl text-espresso leading-none">Counter QR</p>
          <p className="font-hand text-xl text-saffron-deep mt-1">bhaiya ko yeh dikhao</p>
        </div>
        <button
          onClick={() => setGen((g) => g + 1)}
          className="flex items-center gap-1.5 text-[11.5px] font-bold text-espresso/60 hover:text-saffron-deep transition-colors border border-espresso/20 rounded-full px-3 h-9"
          data-hover
        >
          <RefreshCw size={12.5} /> Naya QR
        </button>
      </div>

      <div className="relative w-[264px] h-[264px] mx-auto">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 264 264" aria-hidden="true">
          <circle cx="132" cy="132" r={R} fill="none" stroke="#F0E2BD" strokeWidth="7" />
          <circle
            ref={ringRef}
            cx="132"
            cy="132"
            r={R}
            fill="none"
            stroke={ringColor}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            className="transition-colors duration-700"
          />
        </svg>
        <div className="absolute inset-[24px] grid place-items-center bg-white rounded-[1.1rem]">
          <QRCode value={orderQRPayload(order)} size={182} fgColor="#241410" bgColor="#FFFFFF" level="M" />
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-[12px] font-bold tracking-[0.2em] text-espresso/55">
          {remain > 0 ? "QR ZINDA HAI" : "QR SO GAYA — NAYA LE LO"}
        </p>
        <p className="font-display font-black text-3xl tabular-nums" style={{ color: ringColor }}>
          {mm}:{String(ss).padStart(2, "0")}
        </p>
      </div>

      <div className="mt-4 bg-parchment rounded-2xl p-4 space-y-1.5">
        {order.redeem ? (
          <>
            <p className="text-[12.5px] font-bold text-gold-deep flex items-center gap-1.5">
              <Sparkles size={13} /> DANE SE FREE INAAM
            </p>
            <p className="text-[12px] font-semibold text-espresso/60">
              {order.redeem.daneSpent} dane kharch hue — ek rupaya nahi. QR dikhao, inaam lo.
            </p>
          </>
        ) : order.payment === "online" ? (
          <>
            <p className="text-[12.5px] font-bold text-leaf flex items-center gap-1.5">
              <Sparkles size={13} /> PAID ONLINE {order.paymentId ? `· ${order.paymentId.slice(0, 14)}…` : ""}
            </p>
            <p className="text-[12px] font-semibold text-espresso/60">
              Paisa pakka — bas QR dikhao aur thaila uthao.
            </p>
          </>
        ) : (
          <>
            <p className="text-[12.5px] font-bold text-saffron-deep flex items-center gap-1.5">
              <ScanLine size={13} /> COUNTER PE PAY KARNA HAI
            </p>
            <p className="text-[12px] font-semibold text-espresso/60">
              Cash ya UPI — bhaiya QR scan karke hisaab laga lenge.
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function SuccessPage({ order }: { order: Order }) {
  const { customer, setLoginOpen, nav, toast } = useStore();
  const [paidNow, setPaidNow] = useState(false);
  const [payingNow, setPayingNow] = useState(false);

  /* customer can settle a counter order online right from here */
  const payNow = async () => {
    if (payingNow) return;
    setPayingNow(true);
    const res = await payWithRazorpay({
      amount: order.total,
      orderId: order.id,
      name: order.customerName,
      phone: order.phone,
    });
    setPayingNow(false);
    if (!res.ok || !res.paymentId) {
      if (res.reason !== "dismissed") toast("Payment adhura reh gaya — dobara try karo.", "warn");
      return;
    }
    await confirmOnlinePayment(order.id, res.paymentId);
    setPaidNow(true);
    toast("Payment pakka! Counter ko pata chal gaya.", "ok");
  };

  const effective: Order = paidNow
    ? { ...order, payment: "online", paid: true, paymentId: order.paymentId ?? "RZP-CHECKOUT" }
    : order;

  /* confetti celebration */
  useEffect(() => {
    const burst = () =>
      confetti({
        particleCount: 90,
        spread: 85,
        startVelocity: 40,
        origin: { x: 0.5, y: 0.38 },
        colors: CONFETTI_COLORS,
        scalar: 0.95,
        zIndex: 96,
      });
    burst();
    const t1 = window.setTimeout(burst, 380);
    const rain = window.setInterval(() => {
      confetti({
        particleCount: 24,
        angle: 270,
        startVelocity: 14,
        spread: 170,
        origin: { x: Math.random() * 0.8 + 0.1, y: -0.06 },
        colors: CONFETTI_COLORS,
        ticks: 280,
        gravity: 0.8,
        scalar: 0.85,
        zIndex: 96,
      });
    }, 550);
    const stop = window.setTimeout(() => window.clearInterval(rain), 3200);
    return () => {
      window.clearTimeout(t1);
      window.clearInterval(rain);
      window.clearTimeout(stop);
    };
  }, []);

  const nextTier = customer ? REWARD_TIERS.find((t) => t.grains > customer.dane) : undefined;
  const tierPct = customer
    ? nextTier
      ? Math.min(100, Math.round((customer.dane / nextTier.grains) * 100))
      : 100
    : 0;

  return (
    <div className="pt-24 sm:pt-28 pb-24 max-w-6xl mx-auto px-5 sm:px-8">
      {/* headline */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <motion.svg viewBox="0 0 96 96" className="w-20 h-20 sm:w-24 sm:h-24 shrink-0">
          <motion.circle
            cx="48"
            cy="48"
            r="43"
            fill="none"
            stroke="#2F7D3B"
            strokeWidth="5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.65, ease: "easeInOut" }}
          />
          <motion.path
            d="M29 50 L43 64 L68 35"
            fill="none"
            stroke="#2F7D3B"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.55, duration: 0.38 }}
          />
        </motion.svg>
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.55 }}
            className="font-display font-black text-5xl sm:text-6xl text-espresso leading-[0.95]"
          >
            {order.redeem ? (
              <>
                Inaam <span className="italic text-gold-deep">FREE!</span>
              </>
            ) : (
              <>
                Order <span className="italic text-saffron-deep">pakka!</span>
              </>
            )}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="font-hand text-2xl text-espresso/65 mt-2"
          >
            {order.redeem
              ? `${order.customerName.split(" ")[0]} ji, dane se ${order.redeem.reward} mil gaya — ek rupaya nahi!`
              : `${order.customerName.split(" ")[0]} ji, mithai taiyaar hone lagi…`}
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-3 flex flex-wrap gap-2.5"
          >
            <span className="bg-espresso text-cream text-[12px] font-bold tracking-wider px-3.5 py-1.5 rounded-full">
              {order.id}
            </span>
            {order.redeem ? (
              <span className="bg-gold text-espresso-deep text-[12px] font-bold tracking-wider px-3.5 py-1.5 rounded-full">
                DANE SE FREE
              </span>
            ) : order.paid || paidNow ? (
              <span className="bg-leaf text-cream text-[12px] font-bold tracking-wider px-3.5 py-1.5 rounded-full">
                PAID ONLINE
              </span>
            ) : (
              <span className="bg-gold text-espresso-deep text-[12px] font-bold tracking-wider px-3.5 py-1.5 rounded-full">
                COUNTER PE PAY
              </span>
            )}
            <span className="bg-white/80 border border-espresso/15 text-espresso/70 text-[12px] font-bold px-3.5 py-1.5 rounded-full">
              Pickup: {order.pickup}
            </span>
          </motion.div>
        </div>
      </div>

      <div className="mt-12 grid lg:grid-cols-[1fr_400px] gap-8 items-start">
        {/* left column */}
        <div className="space-y-6">
          {/* what next */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.55 }}
            className="bg-white/60 backdrop-blur border border-white rounded-[1.6rem] p-6 sm:p-7 shadow-card"
          >
            <p className="text-[11px] font-bold tracking-[0.26em] text-espresso/55 mb-4">AB KYA HOGA?</p>
            <ol className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: ScanLine, t: "Counter pe jao", d: "Neeche wala QR dikha do" },
                { icon: ShoppingBag, t: order.redeem ? "Inaam uthao" : "Thaila uthao", d: order.redeem ? "Bilkul FREE — dana ka inaam" : "Garam garam, tula hua" },
                { icon: Sparkles, t: order.redeem ? "Dane kharch hue" : "Dane judenge", d: order.redeem ? `−${order.redeem.daneSpent} sakhar ke dane` : `+${order.grainsEarned} sakhar ke dane` },
              ].map((s, i) => (
                <li key={s.t} className="relative bg-parchment/70 rounded-2xl p-5">
                  <span className="absolute -top-2.5 -left-2 grid place-items-center w-7 h-7 rounded-full bg-saffron-deep text-cream text-xs font-black">
                    {i + 1}
                  </span>
                  <s.icon size={22} className="text-saffron-deep" />
                  <p className="font-display font-bold text-[16.5px] mt-2">{s.t}</p>
                  <p className="text-[12.5px] font-semibold text-espresso/60 mt-0.5">{s.d}</p>
                </li>
              ))}
            </ol>
          </motion.div>

          {/* bill */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.55 }}
            className="bg-white/60 backdrop-blur border border-white rounded-[1.6rem] p-6 sm:p-7 shadow-card"
          >
            <div className="flex items-baseline justify-between mb-4">
              <p className="text-[11px] font-bold tracking-[0.26em] text-espresso/55">PURA HISAB</p>
              <p className="font-hand text-xl text-espresso/50">
                {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                {" baje"}
              </p>
            </div>
            <ul className="divide-y divide-espresso/8">
              {order.items.map((i) => (
                <li key={i.key} className="flex items-center gap-3 py-3">
                  <img src={i.image} alt="" draggable={false} className="w-11 h-11 rounded-lg object-cover ring-1 ring-espresso/10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-espresso truncate">
                      {i.name} <span className="text-espresso/45 font-semibold">× {i.qty}</span>
                    </p>
                    <p className="text-[11.5px] font-semibold text-espresso/50">{i.unit.label}</p>
                  </div>
                  <span className="font-display font-bold">{inr(i.unit.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-4 border-t-[2.5px] border-dashed border-espresso/20 flex items-center justify-between">
              <span className="text-sm font-bold tracking-wide text-espresso/60">KUL JOD</span>
              <span className="font-display font-black text-3xl text-espresso">{inr(order.total)}</span>
            </div>
          </motion.div>

          {/* loyalty */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.55 }}
            className="relative overflow-hidden bg-espresso-deep text-cream rounded-[1.6rem] p-6 sm:p-8 shadow-lift"
          >
            <SugarParticles id="success-sugar" className="absolute inset-0" />
            <div className="relative">
              {customer ? (
                <>
                  <p className="text-[11px] font-bold tracking-[0.26em] text-gold mb-2">
                    SAKHAR KE DANE · {customer.name.split(" ")[0].toUpperCase()} JI KA KHATA
                  </p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-saffron text-4xl font-black">+</span>
                    <RollCounter value={order.grainsEarned} className="font-display font-black text-6xl sm:text-7xl text-gold" />
                    <span className="font-display font-bold text-xl text-cream/80">dane is order se</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-cream/65">
                    Khate mein kul <b className="text-gold">{customer.dane}</b> dane
                    {nextTier ? (
                      <>
                        {" "}
                        — <b className="text-cream">{nextTier.grains - customer.dane}</b> aur toh{" "}
                        <b className="text-gold">{nextTier.reward}</b> pakka!
                      </>
                    ) : (
                      " — saare inaam khul gaye, wah!"
                    )}
                  </p>
                  {nextTier && (
                    <div className="mt-4 h-2.5 bg-cream/12 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${tierPct}%` }}
                        transition={{ delay: 1, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-saffron to-gold"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.26em] text-gold mb-1.5">OYE, DANE CHHOOT RAHE HAIN!</p>
                    <p className="font-display font-bold text-2xl">
                      Is order ke <span className="text-gold">+{order.grainsEarned} dane</span> aapke intezaar mein
                    </p>
                    <p className="text-sm font-semibold text-cream/60 mt-1">
                      Naam + phone do, dane khate mein — 100 dane pe free doodh!
                    </p>
                  </div>
                  <button
                    onClick={() => setLoginOpen(true)}
                    className="flex items-center gap-2 bg-saffron text-espresso-deep font-bold px-6 h-12 rounded-full hover:bg-gold transition-colors shrink-0"
                    data-hover
                  >
                    <User size={16} /> Khata kholo
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* right: QR */}
        <div className="lg:sticky lg:top-24 space-y-4">
          <QRCard order={effective} />

          {/* pay online now — for counter orders */}
          {order.payment === "counter" && !order.paid && !paidNow && (
            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => void payNow()}
              disabled={payingNow}
              className="w-full py-3.5 rounded-2xl bg-saffron-deep text-cream font-bold flex items-center justify-center gap-2 hover:bg-espresso transition-colors disabled:opacity-60 shadow-card"
              data-hover
            >
              {payingNow ? (
                <>
                  <span className="w-5 h-5 rounded-full border-2 border-cream/30 border-t-cream animate-spin" />
                  Razorpay khul raha hai…
                </>
              ) : (
                <>
                  <Smartphone size={17} /> Abhi online pay karo — {inr(order.total)}
                </>
              )}
            </motion.button>
          )}

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => nav({ page: "home" })}
            className="w-full h-13 py-3.5 rounded-2xl bg-espresso text-cream font-bold flex items-center justify-center gap-2 hover:bg-saffron-deep transition-colors"
            data-hover
          >
            Wapas dhaabe pe <ArrowRight size={17} />
          </motion.button>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={() => {
              nav({ page: "home" });
              window.setTimeout(() => scrollToId("#menu"), 520);
            }}
            className="w-full h-12 rounded-2xl border-[1.5px] border-espresso/25 text-espresso/75 font-bold hover:border-saffron-deep hover:text-saffron-deep transition-colors"
            data-hover
          >
            Ek aur order?
          </motion.button>
        </div>
      </div>
    </div>
  );
}
