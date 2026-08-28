/* ── Kapila Dairy · cart drawer + checkout + success + pay page ───── */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "react-qr-code";
import { animate } from "animejs";
import confetti from "canvas-confetti";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Minus, Plus, ScanLine, ShoppingBag,
  Smartphone, Sparkles, Trash2, X, Banknote, RefreshCw,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  cartTotal, grainsFrom, inr, makeOrderId, orderQRPayload, QR_EXPIRY_MS, REWARD_TIERS,
  type CartItem, type Order, type PaymentMethod,
} from "../lib/data";
import { payWithRazorpay } from "../lib/razorpay";
import { confirmOnlinePayment, getPayOrder, type PayOrder } from "../lib/supabase";
import { scrollToId } from "../lib/scroll";
import { RollCounter } from "./fx";

const CONFETTI_COLORS = ["#FF9933", "#FFD700", "#FFFEF0", "#E2670A"];

/* ───────────────────────── CART DRAWER ───────────────────────── */
function CartRow({ item }: { item: CartItem }) {
  const { setQty, removeItem } = useStore();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -230, transition: { duration: 0.28 } }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.55}
      onDragEnd={(_, info) => { if (info.offset.x < -90) removeItem(item.key); }}
      className="group relative flex items-center gap-3 bg-white/75 border border-espresso/10 rounded-2xl p-2.5 pr-3 shadow-sm"
    >
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-chili/60 text-[10px] font-bold tracking-widest opacity-0 group-hover:opacity-60 transition-opacity select-none">←</span>
      <img src={item.image} alt={item.name} draggable={false} className="w-[58px] h-[58px] rounded-xl object-cover shrink-0 ring-1 ring-espresso/10" />
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-[15px] text-espresso truncate">{item.name}</p>
        <p className="text-[11.5px] font-semibold text-espresso/55">{item.unit.label} · {inr(item.unit.price)}</p>
        <div className="mt-1.5 inline-flex items-center gap-1 bg-cream border border-espresso/15 rounded-full p-0.5">
          <button onClick={() => setQty(item.key, item.qty - 1)} className="w-7 h-7 grid place-items-center rounded-full hover:bg-saffron hover:text-cream transition-colors" data-hover aria-label="Kam"><Minus size={13} strokeWidth={3} /></button>
          <motion.span key={item.qty} initial={{ scale: 0.5, y: 4 }} animate={{ scale: 1, y: 0 }} className="w-6 text-center text-sm font-black text-espresso">{item.qty}</motion.span>
          <button onClick={() => setQty(item.key, item.qty + 1)} className="w-7 h-7 grid place-items-center rounded-full hover:bg-saffron hover:text-cream transition-colors" data-hover aria-label="Badhao"><Plus size={13} strokeWidth={3} /></button>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="font-display font-black text-[16px] text-espresso">{inr(item.unit.price * item.qty)}</span>
        <button onClick={() => removeItem(item.key)} className="text-espresso/35 hover:text-chili transition-colors" data-hover aria-label="Hatao"><Trash2 size={15} /></button>
      </div>
    </motion.div>
  );
}

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, nav, customer, setLoginOpen } = useStore();
  const total = cartTotal(cart);
  const grains = grainsFrom(total);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCartOpen(false)} className="fixed inset-0 z-[84] bg-espresso-deep/55 backdrop-blur-[3px]" />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[432px] z-[85] bg-cream border-l border-gold/50 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-espresso/10">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-11 h-11 rounded-full bg-saffron text-espresso-deep"><ShoppingBag size={20} strokeWidth={2.3} /></span>
                <div>
                  <h2 className="font-display font-black text-2xl leading-none">Aapka Thela</h2>
                  <p className="text-[11.5px] font-semibold text-espresso/55 mt-0.5">{count} cheez · swipe ← karke hatao</p>
                </div>
              </div>
              <button onClick={() => setCartOpen(false)} className="w-10 h-10 grid place-items-center rounded-full border border-espresso/20 hover:bg-espresso hover:text-cream transition-colors" data-hover aria-label="Band karo"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <AnimatePresence mode="popLayout">
                {cart.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col items-center justify-center text-center px-6">
                    <motion.span animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} className="grid place-items-center w-24 h-24 rounded-full bg-sand/70 border-2 border-dashed border-espresso/25 mb-5">
                      <ShoppingBag size={36} className="text-espresso/40" />
                    </motion.span>
                    <p className="font-display font-black text-2xl">Thela khaali hai ji!</p>
                    <p className="font-hand text-2xl text-saffron-deep mt-1">kuch meetha toh banta hai…</p>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setCartOpen(false); scrollToId("#menu"); }} className="mt-6 bg-espresso text-cream font-bold px-7 h-12 rounded-full hover:bg-saffron-deep transition-colors" data-hover>
                      Menu dekho
                    </motion.button>
                  </motion.div>
                ) : (
                  cart.map((item) => <CartRow key={item.key} item={item} />)
                )}
              </AnimatePresence>
            </div>

            {cart.length > 0 && (
              <div className="border-t border-espresso/10 px-6 pt-4 pb-6 bg-parchment/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-espresso/60 tracking-wide">KUL JOD</span>
                  <motion.span key={total} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="font-display font-black text-3xl text-espresso">{inr(total)}</motion.span>
                </div>
                <div className="flex items-center gap-2.5 bg-gold/25 border border-gold-deep/30 rounded-xl px-3.5 py-2.5 mb-4">
                  <Sparkles size={16} className="text-gold-deep shrink-0" />
                  {customer ? (
                    <p className="text-[12.5px] font-semibold text-espresso/80">Is order pe <b className="text-saffron-deep">+{grains} sakhar ke dane</b> milenge!</p>
                  ) : (
                    <button onClick={() => setLoginOpen(true)} className="text-left text-[12.5px] font-semibold text-espresso/80 hover:text-saffron-deep transition-colors underline decoration-dotted underline-offset-2" data-hover>
                      Login karo aur <b className="text-saffron-deep">+{grains} dane</b> kamao
                    </button>
                  )}
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => nav({ page: "checkout" })} className="w-full h-14 rounded-2xl bg-saffron-deep text-cream font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-espresso transition-colors shadow-lift" data-hover>
                  Checkout karo <ArrowRight size={18} strokeWidth={2.6} />
                </motion.button>
                <p className="text-center text-[11px] text-espresso/50 font-medium mt-2.5">Payment online (Razorpay) ya counter pe — dono chalega</p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── CHECKOUT ───────────────────────── */
const PICKUPS = ["Abhi turant", "30 minute mein", "1 ghante mein", "Shaam tak"];

export function Checkout() {
  const { cart, customer, setLoginOpen, placeOrder, clearCart, nav, toast } = useStore();
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [pickup, setPickup] = useState(PICKUPS[0]);
  const [note, setNote] = useState("");
  const [pay, setPay] = useState<PaymentMethod>("counter");
  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState("");

  const total = cartTotal(cart);
  const grains = grainsFrom(total);

  if (cart.length === 0 && !placing) {
    return (
      <div className="min-h-[70vh] pt-28 grid place-items-center px-5">
        <div className="text-center">
          <span className="mx-auto grid place-items-center w-20 h-20 rounded-full bg-sand/70 border-2 border-dashed border-espresso/25 mb-5"><ShoppingBag size={30} className="text-espresso/40" /></span>
          <p className="font-display font-black text-3xl">Thela khaali, hisaab kaisa?</p>
          <p className="font-hand text-2xl text-saffron-deep mt-1">pehle kuch meetha uthao…</p>
          <button onClick={() => { nav({ page: "home" }); window.setTimeout(() => scrollToId("#menu"), 520); }} className="mt-6 bg-espresso text-cream font-bold px-7 h-12 rounded-full hover:bg-saffron-deep transition-colors" data-hover>
            Menu pe jao
          </button>
        </div>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (placing) return;
    if (name.trim().length < 2) return setErr("Naam likho ji — kam se kam 2 akshar.");
    if (!/^\d{10}$/.test(phone)) return setErr("Phone number 10 digit ka hona chahiye.");
    setErr(""); setPlacing(true);

    const order: Order = {
      id: makeOrderId(), createdAt: new Date().toISOString(),
      customerName: name.trim(), phone, note: note.trim() || undefined, pickup,
      items: cart, total, payment: pay, paid: false, grainsEarned: grains,
    };

    if (pay === "online") {
      const res = await payWithRazorpay({ amount: total, orderId: order.id, name, phone });
      if (!res.ok) {
        setPlacing(false);
        if (res.reason === "no-key" || res.reason === "sdk-not-loaded") toast("Razorpay setup ho raha hai — abhi 'Counter pe' chun lo!", "warn");
        else toast("Payment adhura reh gaya — koi baat nahi, dobara try karo.", "warn");
        return;
      }
      order.paid = true;
      order.paymentId = res.paymentId;
      await confirmOnlinePayment(order.id, res.paymentId ?? "");
    }

    placeOrder(order);
    clearCart();
    nav({ page: "success", order });
  };

  return (
    <div className="pt-24 sm:pt-28 pb-20 max-w-6xl mx-auto px-5 sm:px-8">
      <button onClick={() => nav({ page: "home" })} className="group flex items-center gap-2 text-sm font-bold text-espresso/60 hover:text-saffron-deep transition-colors mb-6" data-hover>
        <ArrowLeft size={17} className="group-hover:-translate-x-1 transition-transform" /> Aur kuch jodna hai?
      </button>
      <h1 className="font-display font-black text-5xl sm:text-6xl text-espresso leading-[0.95]">
        Thoda sa <span className="italic text-saffron-deep">hisaab</span>
      </h1>
      <p className="font-hand text-2xl text-espresso/60 mt-2">do minute ka kaam — bas naam aur number</p>

      <form onSubmit={submit} className="mt-9 grid lg:grid-cols-[1.2fr_1fr] gap-7 items-start">
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur border border-white rounded-[1.6rem] p-6 sm:p-7 shadow-card">
            <p className="text-[11px] font-bold tracking-[0.26em] text-espresso/55 mb-4">KON LE RAHE HO?</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-espresso/60 mb-1.5">Naam</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Gupta" className="w-full h-12 px-4 rounded-xl border-[1.5px] border-espresso/20 bg-white/80 text-[15px] font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-espresso/60 mb-1.5">Phone (10 digit)</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="98765 43210" inputMode="numeric" className="w-full h-12 px-4 rounded-xl border-[1.5px] border-espresso/20 bg-white/80 text-[15px] font-medium tracking-widest" />
              </div>
            </div>

            {!customer && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-espresso text-cream rounded-2xl px-5 py-3.5">
                <p className="text-[13px] font-semibold flex items-center gap-2">
                  <Sparkles size={16} className="text-gold shrink-0" />
                  Login karo — is order ke <b className="text-gold">+{grains} dane</b> pakke
                </p>
                <button type="button" onClick={() => setLoginOpen(true)} className="flex items-center gap-1.5 bg-saffron text-espresso-deep text-xs font-bold px-4 h-9 rounded-full hover:bg-gold transition-colors" data-hover>
                  Login
                </button>
              </div>
            )}

            <p className="text-[11px] font-bold tracking-[0.26em] text-espresso/55 mt-6 mb-2.5">KAB AAOGE LENE?</p>
            <div className="flex flex-wrap gap-2">
              {PICKUPS.map((p) => (
                <button type="button" key={p} onClick={() => setPickup(p)} className={`h-10 px-4 rounded-full text-[13px] font-bold border-[1.5px] transition-colors ${pickup === p ? "bg-espresso text-cream border-espresso" : "border-espresso/25 bg-white/60 text-espresso/70 hover:border-espresso/60"}`} data-hover>
                  {p}
                </button>
              ))}
            </div>

            <label className="block text-xs font-bold text-espresso/60 mt-5 mb-1.5">Kuch kehna hai halwai ko? (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. laddoo thode naram rakhna" className="w-full px-4 py-3 rounded-xl border-[1.5px] border-espresso/20 bg-white/80 text-[14.5px] font-medium resize-none" />
          </div>

          <div className="bg-white/60 backdrop-blur border border-white rounded-[1.6rem] p-6 sm:p-7 shadow-card">
            <p className="text-[11px] font-bold tracking-[0.26em] text-espresso/55 mb-4">PAISE KAISE?</p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <button type="button" onClick={() => setPay("online")} className={`relative text-left rounded-2xl border-2 p-5 transition-all ${pay === "online" ? "border-saffron bg-saffron/10 shadow-card" : "border-espresso/15 bg-white/50 hover:border-espresso/40"}`} data-hover>
                {pay === "online" && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3.5 right-3.5 grid place-items-center w-6 h-6 rounded-full bg-saffron-deep text-cream"><Check size={13} strokeWidth={3.2} /></motion.span>}
                <Smartphone size={22} className={pay === "online" ? "text-saffron-deep" : "text-espresso/50"} />
                <p className="font-display font-bold text-xl mt-2.5">Online Pay</p>
                <p className="text-[12.5px] font-semibold text-espresso/60 mt-1">Razorpay se — UPI, card, netbanking. Ghar se hi pakka.</p>
              </button>
              <button type="button" onClick={() => setPay("counter")} className={`relative text-left rounded-2xl border-2 p-5 transition-all ${pay === "counter" ? "border-saffron bg-saffron/10 shadow-card" : "border-espresso/15 bg-white/50 hover:border-espresso/40"}`} data-hover>
                {pay === "counter" && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3.5 right-3.5 grid place-items-center w-6 h-6 rounded-full bg-saffron-deep text-cream"><Check size={13} strokeWidth={3.2} /></motion.span>}
                <ScanLine size={22} className={pay === "counter" ? "text-saffron-deep" : "text-espresso/50"} />
                <p className="font-display font-bold text-xl mt-2.5">Counter Pe</p>
                <p className="text-[12.5px] font-semibold text-espresso/60 mt-1">Dukaan pe cash ya UPI. QR dikhao, bhaiya hisaab kar lenge.</p>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 bg-espresso-deep text-cream rounded-[1.6rem] p-6 sm:p-7 shadow-lift relative overflow-hidden">
          <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-saffron/20 blur-3xl" />
          <p className="text-[11px] font-bold tracking-[0.26em] text-gold mb-4">THAILA</p>
          <ul className="space-y-3">
            {cart.map((i) => (
              <li key={i.key} className="flex items-center gap-3">
                <img src={i.image} alt="" draggable={false} className="w-11 h-11 rounded-lg object-cover ring-1 ring-cream/20" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold truncate">{i.name} <span className="text-cream/50 font-semibold">× {i.qty}</span></p>
                  <p className="text-[11px] font-semibold text-cream/50">{i.unit.label}</p>
                </div>
                <span className="font-display font-bold text-[15px]">{inr(i.unit.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 pt-4 border-t border-cream/15 space-y-2">
            <div className="flex justify-between text-sm font-semibold text-cream/70"><span>Sakhar ke dane</span><span className="text-gold">+{grains}</span></div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-bold tracking-wide text-cream/70">KUL JOD</span>
              <span className="font-display font-black text-4xl text-gold">{inr(total)}</span>
            </div>
          </div>
          {err && <p className="text-gold text-xs font-bold mt-3">{err}</p>}
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={placing} className="mt-5 w-full h-14 rounded-2xl bg-saffron text-espresso-deep font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-gold transition-colors disabled:opacity-60" data-hover>
            {placing ? (<><span className="w-5 h-5 rounded-full border-[2.5px] border-espresso-deep/30 border-t-espresso-deep animate-spin" />Pakka ho raha hai…</>)
              : pay === "online" ? (<>Pay {inr(total)} & Order pakka <ArrowRight size={18} strokeWidth={2.6} /></>)
              : (<>Order pakka karo <ArrowRight size={18} strokeWidth={2.6} /></>)}
          </motion.button>
          <p className="text-center text-[11px] font-semibold text-cream/45 mt-3">Order hote hi QR ban jayega — counter pe dikhana</p>
        </div>
      </form>
    </div>
  );
}

/* ───────────────────────── SUCCESS + QR TICKET ───────────────────────── */
const R = 118;
const CIRC = 2 * Math.PI * R;

function QRTicket({ order }: { order: Order }) {
  const ringRef = useRef<SVGCircleElement>(null);
  const [remain, setRemain] = useState(QR_EXPIRY_MS);
  const [gen, setGen] = useState(0);

  useEffect(() => {
    const start = Date.now();
    setRemain(QR_EXPIRY_MS);
    if (ringRef.current) animate(ringRef.current, { strokeDashoffset: [0, CIRC], duration: QR_EXPIRY_MS, ease: "linear" });
    const iv = window.setInterval(() => {
      const left = QR_EXPIRY_MS - (Date.now() - start);
      setRemain(Math.max(0, left));
      if (left <= 0) window.clearInterval(iv);
    }, 1000);
    return () => window.clearInterval(iv);
  }, [gen]);

  const frac = remain / QR_EXPIRY_MS;
  const ringColor = frac > 0.5 ? "#2F7D3B" : frac > 0.2 ? "#C9971C" : "#C62828";
  const mm = Math.floor(remain / 60000);
  const ss = Math.floor((remain % 60000) / 1000);
  const payload = orderQRPayload(order);

  return (
    <motion.div
      initial={{ scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 210, damping: 15, delay: 0.4 }}
      className="bg-white rounded-[2rem] p-7 sm:p-8 shadow-lift border border-gold/40"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.28em] text-espresso/50">COUNTER TICKET</p>
          <p className="font-display font-black text-2xl text-espresso">{order.id}</p>
        </div>
        <span className={`text-[12px] font-bold tracking-wider px-3.5 py-1.5 rounded-full ${order.redeem ? "bg-leaf text-cream" : order.paid ? "bg-leaf text-cream" : "bg-gold text-espresso-deep"}`}>
          {order.redeem ? "DANE SE FREE" : order.paid ? "PAID ONLINE" : "COUNTER PE PAY"}
        </span>
      </div>

      <div className="relative w-fit mx-auto my-4">
        <svg width="270" height="270" viewBox="0 0 270 270" className="absolute -inset-[14px] -rotate-90">
          <circle cx="135" cy="135" r={R} fill="none" stroke="#f0e2bd" strokeWidth="6" />
          <circle ref={ringRef} cx="135" cy="135" r={R} fill="none" stroke={ringColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={CIRC} style={{ transition: "stroke 0.4s" }} />
        </svg>
        <div className="bg-white p-4 rounded-2xl">
          <QRCode value={payload} size={190} fgColor="#241410" bgColor="#FFFFFF" level="M" />
        </div>
      </div>

      <div className="text-center">
        <p className="font-hand text-2xl text-saffron-deep">bhaiya ko yeh QR dikhao</p>
        <p className="text-[12px] font-semibold text-espresso/55 mt-1">
          Ticket <span className="font-bold" style={{ color: ringColor }}>{mm}:{String(ss).padStart(2, "0")}</span> mein expire hogi
        </p>
      </div>

      {remain <= 0 && (
        <button onClick={() => setGen((g) => g + 1)} className="mt-4 w-full h-12 rounded-xl bg-espresso text-cream font-bold flex items-center justify-center gap-2 hover:bg-saffron-deep transition-colors" data-hover>
          <RefreshCw size={16} /> Nayi ticket banao
        </button>
      )}
    </motion.div>
  );
}

export function Success({ order }: { order: Order }) {
  const { customer, nav } = useStore();
  const [paidNow, setPaidNow] = useState(false);
  const [payingNow, setPayingNow] = useState(false);

  useEffect(() => {
    const burst = () => confetti({ particleCount: 90, spread: 85, startVelocity: 40, origin: { x: 0.5, y: 0.38 }, colors: CONFETTI_COLORS, scalar: 0.95, zIndex: 96 });
    burst();
    const t1 = window.setTimeout(burst, 380);
    const rain = window.setInterval(() => confetti({ particleCount: 24, angle: 270, startVelocity: 14, spread: 170, origin: { x: Math.random() * 0.8 + 0.1, y: -0.06 }, colors: CONFETTI_COLORS, ticks: 280, gravity: 0.8, scalar: 0.85, zIndex: 96 }), 550);
    const stop = window.setTimeout(() => window.clearInterval(rain), 3200);
    return () => { window.clearTimeout(t1); window.clearInterval(rain); window.clearTimeout(stop); };
  }, []);

  const payNow = async () => {
    if (payingNow) return;
    setPayingNow(true);
    const res = await payWithRazorpay({ amount: order.total, orderId: order.id, name: order.customerName, phone: order.phone });
    setPayingNow(false);
    if (!res.ok || !res.paymentId) return;
    await confirmOnlinePayment(order.id, res.paymentId);
    setPaidNow(true);
  };

  const effective: Order = paidNow ? { ...order, payment: "online", paid: true } : order;
  const nextTier = customer ? REWARD_TIERS.find((t) => t.grains > customer.dane) : undefined;

  return (
    <div className="pt-24 sm:pt-28 pb-24 max-w-6xl mx-auto px-5 sm:px-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <motion.svg viewBox="0 0 96 96" className="w-20 h-20 sm:w-24 sm:h-24 shrink-0">
          <motion.circle cx="48" cy="48" r="43" fill="none" stroke="#2F7D3B" strokeWidth="5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.65, ease: "easeInOut" }} />
          <motion.path d="M30 50 L43 62 L67 36" fill="none" stroke="#2F7D3B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.4 }} />
        </motion.svg>
        <div>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="font-display font-black text-5xl sm:text-6xl text-espresso leading-[0.95]">
            {order.redeem ? <>Inaam <span className="italic text-gold-deep">FREE!</span></> : <>Order <span className="italic text-saffron-deep">pakka!</span></>}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="font-hand text-2xl text-espresso/65 mt-2">
            {order.redeem
              ? `${order.customerName.split(" ")[0]} ji, ${order.redeem?.reward} mil gaya — ek rupaya nahi!`
              : `${order.customerName.split(" ")[0]} ji, mithai taiyaar hone lagi…`}
          </motion.p>
        </div>
      </div>

      <div className="mt-12 grid lg:grid-cols-[1.1fr_1fr] gap-8 items-start">
        {/* left: order summary + loyalty */}
        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white/60 border border-white rounded-[1.6rem] p-6 shadow-card">
            <p className="text-[11px] font-bold tracking-[0.26em] text-espresso/55 mb-4">THAILA</p>
            <ul className="divide-y divide-espresso/10">
              {order.items.map((i) => (
                <li key={i.key} className="flex items-center gap-3 py-3">
                  <img src={i.image} alt="" draggable={false} className="w-12 h-12 rounded-xl object-cover ring-1 ring-espresso/10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-[15px]">{i.name} <span className="text-espresso/50">× {i.qty}</span></p>
                    <p className="text-[11.5px] font-semibold text-espresso/55">{i.unit.label}</p>
                  </div>
                  <span className="font-display font-black">{inr(i.unit.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-espresso/15 flex justify-between items-baseline">
              <span className="text-sm font-bold text-espresso/60">KUL JOD</span>
              <span className="font-display font-black text-3xl text-espresso">{order.redeem ? <span className="text-leaf">FREE</span> : inr(order.total)}</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="bg-espresso-deep text-cream rounded-[1.6rem] p-6 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gold/15 blur-3xl" />
            <p className="text-[11px] font-bold tracking-[0.26em] text-gold mb-3">SAKHAR KE DANE</p>
            {order.redeem ? (
              <p className="text-sm font-semibold text-cream/75">
                Aapne <b className="text-gold">{order.redeem?.daneSpent} dane</b> kharch kiye — inaam FREE mila!
              </p>
            ) : (
              <div className="flex items-baseline gap-2.5">
                <span className="text-sm font-bold text-cream/60">Is order se</span>
                <RollCounter value={order.grainsEarned} className="font-display font-black text-5xl text-gold" />
                <span className="text-sm font-bold text-cream/60">dane mile</span>
              </div>
            )}
            {customer && !order.redeem && (
              <p className="text-[12.5px] font-semibold text-cream/60 mt-3">
                Khate mein kul <b className="text-gold">{customer.dane}</b> dane
                {nextTier && <> — <b className="text-cream">{nextTier.grains - customer.dane}</b> aur toh <b className="text-gold">{nextTier.reward}</b></>}
              </p>
            )}
            {!customer && (
              <p className="text-[12.5px] font-semibold text-cream/60 mt-3">Login karoge toh yeh dane aapke khate mein jud jayenge.</p>
            )}
          </motion.div>
        </div>

        {/* right: QR + actions */}
        <div className="lg:sticky lg:top-24 space-y-4">
          <QRTicket order={effective} />
          {order.payment === "counter" && !order.paid && !paidNow && (
            <motion.button
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}
              whileTap={{ scale: 0.97 }} onClick={() => void payNow()} disabled={payingNow}
              className="w-full py-3.5 rounded-2xl bg-saffron-deep text-cream font-bold flex items-center justify-center gap-2 hover:bg-espresso transition-colors disabled:opacity-60 shadow-card"
              data-hover
            >
              {payingNow ? (<><span className="w-5 h-5 rounded-full border-2 border-cream/30 border-t-cream animate-spin" />Razorpay khul raha hai…</>) : (<><Smartphone size={17} /> Abhi online pay karo — {inr(order.total)}</>)}
            </motion.button>
          )}
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} whileTap={{ scale: 0.97 }} onClick={() => nav({ page: "home" })} className="w-full py-3.5 rounded-2xl bg-espresso text-cream font-bold flex items-center justify-center gap-2 hover:bg-saffron-deep transition-colors" data-hover>
            Wapas dhaabe pe <ArrowRight size={17} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── HOSTED PAY PAGE (counter QR) ───────────────────────── */
export function PayPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<PayOrder | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "paying" | "done" | "error">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      const o = await getPayOrder(orderId);
      if (!alive) return;
      if (!o) { setState("error"); return; }
      setOrder(o);
      setState(o.paid ? "done" : "ready");
    })();
    return () => { alive = false; };
  }, [orderId]);

  const pay = async () => {
    if (!order) return;
    setState("paying");
    const res = await payWithRazorpay({ amount: order.total, orderId: order.order_id, name: order.customer_name, phone: order.phone.replace(/\D/g, "").slice(-10) });
    if (!res.ok || !res.paymentId) { setState("ready"); return; }
    await confirmOnlinePayment(order.order_id, res.paymentId);
    setOrder({ ...order, paid: true });
    setState("done");
    confetti({ particleCount: 90, spread: 85, startVelocity: 40, origin: { x: 0.5, y: 0.38 }, colors: CONFETTI_COLORS });
  };

  return (
    <div className="min-h-screen bg-cream flex items-start justify-center px-4 py-10 sm:py-16">
      <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-md bg-white rounded-[1.8rem] shadow-lift border border-gold/40 overflow-hidden">
        <div className="bg-espresso-deep text-cream px-6 py-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-10 w-40 h-40 rounded-full bg-saffron/20 blur-2xl" />
          <p className="font-display font-black text-2xl leading-none">Kapila Dairy</p>
          <p className="font-hand text-xl text-gold mt-0.5">counter payment · safe & pakka</p>
        </div>
        <div className="p-6 sm:p-7">
          {state === "loading" && (
            <div className="py-14 flex flex-col items-center gap-3 text-espresso/60">
              <span className="w-8 h-8 rounded-full border-[3px] border-saffron/30 border-t-saffron-deep animate-spin" />
              <p className="font-semibold text-sm">Order dhundh rahe hain…</p>
            </div>
          )}
          {state === "error" && (
            <div className="py-10 text-center">
              <p className="font-display font-black text-3xl text-espresso">Order nahi mila!</p>
              <p className="text-sm font-semibold text-espresso/60 mt-2">ID <b className="text-saffron-deep">{orderId}</b> galat lag rahi hai — counter pe dobara QR dikhao.</p>
            </div>
          )}
          {order && (state === "ready" || state === "paying" || state === "done") && (
            <>
              <div className="text-center">
                <p className="text-[11px] font-bold tracking-[0.28em] text-espresso/50">BHARNA HAI</p>
                <p className="font-display font-black text-6xl text-espresso mt-1">{inr(order.total)}</p>
                <p className="font-hand text-2xl text-saffron-deep mt-1">{order.paid ? "paisa mil gaya — shukriya!" : "exact amount — ek rupya kam nahi"}</p>
              </div>
              <div className="mt-5 bg-parchment/70 rounded-2xl p-4 space-y-1.5">
                <div className="flex justify-between text-sm"><span className="font-bold text-espresso/55">Order</span><span className="font-mono font-bold text-espresso">{order.order_id}</span></div>
                <div className="flex justify-between text-sm"><span className="font-bold text-espresso/55">Naam</span><span className="font-semibold text-espresso">{order.customer_name}</span></div>
              </div>
              <ul className="mt-4 divide-y divide-espresso/10">
                {order.items.map((i, idx) => (
                  <li key={idx} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="font-semibold text-espresso/85">{i.name} <span className="text-espresso/45">× {i.qty}</span>
                      <span className="block text-[11px] font-semibold text-espresso/45">{i.pack}</span>
                    </span>
                    <span className="font-display font-bold text-espresso">{inr(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
              {state === "done" ? (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-6 bg-leaf/10 border-[1.5px] border-leaf/50 rounded-2xl p-5 text-center">
                  <CheckCircle2 size={38} className="text-leaf mx-auto" />
                  <p className="font-display font-black text-2xl text-espresso mt-2">PAID — Pakka!</p>
                  <p className="text-[13px] font-semibold text-espresso/65 mt-1">Counter pe screen dikhao aur apna thaila uthao. Dhanyavaad!</p>
                </motion.div>
              ) : (
                <motion.button whileTap={{ scale: 0.97 }} onClick={pay} disabled={state === "paying"} className="mt-6 w-full h-14 rounded-2xl bg-saffron-deep text-cream font-bold text-[15px] flex items-center justify-center gap-2.5 hover:bg-espresso transition-colors shadow-lift disabled:opacity-60">
                  {state === "paying" ? (<><span className="w-5 h-5 rounded-full border-2 border-cream/30 border-t-cream animate-spin" />Razorpay khul raha hai…</>) : (<><Smartphone size={18} /> Pay {inr(order.total)} — Razorpay se</>)}
                </motion.button>
              )}
              <p className="text-center text-[11px] font-semibold text-espresso/45 mt-3.5">UPI · Card · Netbanking — payment hote hi counter ko turant pata chal jayega</p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
