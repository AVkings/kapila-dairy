/* ── Kapila Dairy · checkout (online / at-counter) ─────────────────── */
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ScanLine,
  ShoppingBag,
  Smartphone,
  Sparkles,
  User,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  cartTotal,
  grainsFrom,
  inr,
  makeOrderId,
  type Order,
  type PaymentMethod,
} from "../lib/data";
import { payWithRazorpay } from "../lib/razorpay";
import { saveOrderRemote } from "../lib/supabase";
import { scrollToId } from "../lib/scroll";

const PICKUPS = ["Abhi turant", "30 minute mein", "1 ghante mein", "Shaam tak"];

export default function Checkout() {
  const { cart, customer, setLoginOpen, placeOrder, clearCart, nav, toast } = useStore();
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [pickup, setPickup] = useState(PICKUPS[0]);
  const [note, setNote] = useState("");
  const [pay, setPay] = useState<PaymentMethod>("online");
  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState("");

  const total = cartTotal(cart);
  const grains = grainsFrom(total);

  if (cart.length === 0 && !placing) {
    return (
      <div className="min-h-[70vh] pt-28 grid place-items-center px-5">
        <div className="text-center">
          <span className="mx-auto grid place-items-center w-20 h-20 rounded-full bg-sand/70 border-2 border-dashed border-espresso/25 mb-5">
            <ShoppingBag size={30} className="text-espresso/40" />
          </span>
          <p className="font-display font-black text-3xl">Thela khaali, hisaab kaisa?</p>
          <p className="font-hand text-2xl text-saffron-deep mt-1">pehle kuch meetha uthao…</p>
          <button
            onClick={() => {
              nav({ page: "home" });
              window.setTimeout(() => scrollToId("#menu"), 520);
            }}
            className="mt-6 bg-espresso text-cream font-bold px-7 h-12 rounded-full hover:bg-saffron-deep transition-colors"
            data-hover
          >
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
    setErr("");
    setPlacing(true);

    const order: Order = {
      id: makeOrderId(),
      createdAt: new Date().toISOString(),
      customerName: name.trim(),
      phone,
      note: note.trim() || undefined,
      pickup,
      items: cart,
      total,
      payment: pay,
      paid: false,
      grainsEarned: grains,
    };

    if (pay === "online") {
      const res = await payWithRazorpay({ amount: total, orderId: order.id, name, phone });
      if (!res.ok) {
        setPlacing(false);
        if (res.reason === "no-key" || res.reason === "sdk-not-loaded") {
          toast("Razorpay setup ho raha hai — abhi 'Counter pe' chun lo!", "warn");
        } else {
          toast("Payment adhura reh gaya — koi baat nahi, dobara try karo.", "warn");
        }
        return;
      }
      order.paid = true;
      order.paymentId = res.paymentId;
    }

    placeOrder(order);
    void saveOrderRemote(order);
    clearCart();
    nav({ page: "success", order });
  };

  return (
    <div className="pt-24 sm:pt-28 pb-20 max-w-6xl mx-auto px-5 sm:px-8">
      <button
        onClick={() => nav({ page: "home" })}
        className="group flex items-center gap-2 text-sm font-bold text-espresso/60 hover:text-saffron-deep transition-colors mb-6"
        data-hover
      >
        <ArrowLeft size={17} className="group-hover:-translate-x-1 transition-transform" />
        Aur kuch jodna hai?
      </button>

      <h1 className="font-display font-black text-5xl sm:text-6xl text-espresso leading-[0.95]">
        Thoda sa <span className="italic text-saffron-deep">hisaab</span>
      </h1>
      <p className="font-hand text-2xl text-espresso/60 mt-2">do minute ka kaam — bas naam aur number</p>

      <form onSubmit={submit} className="mt-9 grid lg:grid-cols-[1.2fr_1fr] gap-7 items-start">
        {/* left: details */}
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur border border-white rounded-[1.6rem] p-6 sm:p-7 shadow-card">
            <p className="text-[11px] font-bold tracking-[0.26em] text-espresso/55 mb-4">KON LE RAHE HO?</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-espresso/60 mb-1.5">Naam</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Gupta"
                  className="w-full h-12 px-4 rounded-xl border-[1.5px] border-espresso/20 bg-white/80 text-[15px] font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-espresso/60 mb-1.5">Phone (10 digit)</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="98765 43210"
                  inputMode="numeric"
                  className="w-full h-12 px-4 rounded-xl border-[1.5px] border-espresso/20 bg-white/80 text-[15px] font-medium tracking-widest"
                />
              </div>
            </div>

            {!customer && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-espresso text-cream rounded-2xl px-5 py-3.5">
                <p className="text-[13px] font-semibold flex items-center gap-2">
                  <Sparkles size={16} className="text-gold shrink-0" />
                  Login karo — is order ke <b className="text-gold">+{grains} dane</b> pakke
                </p>
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="flex items-center gap-1.5 bg-saffron text-espresso-deep text-xs font-bold px-4 h-9 rounded-full hover:bg-gold transition-colors"
                  data-hover
                >
                  <User size={13} /> Login
                </button>
              </div>
            )}

            <p className="text-[11px] font-bold tracking-[0.26em] text-espresso/55 mt-6 mb-2.5">
              KAB AAOGE LENE?
            </p>
            <div className="flex flex-wrap gap-2">
              {PICKUPS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPickup(p)}
                  className={`h-10 px-4 rounded-full text-[13px] font-bold border-[1.5px] transition-colors ${
                    pickup === p
                      ? "bg-espresso text-cream border-espresso"
                      : "border-espresso/25 bg-white/60 text-espresso/70 hover:border-espresso/60"
                  }`}
                  data-hover
                >
                  {p}
                </button>
              ))}
            </div>

            <label className="block text-xs font-bold text-espresso/60 mt-5 mb-1.5">
              Kuch kehna hai halwai ko? (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. laddoo thode naram rakhna"
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-espresso/20 bg-white/80 text-[14.5px] font-medium resize-none"
            />
          </div>

          {/* payment method */}
          <div className="bg-white/60 backdrop-blur border border-white rounded-[1.6rem] p-6 sm:p-7 shadow-card">
            <p className="text-[11px] font-bold tracking-[0.26em] text-espresso/55 mb-4">PAISE KAISE?</p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setPay("online")}
                className={`relative text-left rounded-2xl border-2 p-5 transition-all ${
                  pay === "online"
                    ? "border-saffron bg-saffron/10 shadow-card"
                    : "border-espresso/15 bg-white/50 hover:border-espresso/40"
                }`}
                data-hover
              >
                {pay === "online" && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3.5 right-3.5 grid place-items-center w-6 h-6 rounded-full bg-saffron-deep text-cream"
                  >
                    <Check size={13} strokeWidth={3.2} />
                  </motion.span>
                )}
                <Smartphone size={22} className={pay === "online" ? "text-saffron-deep" : "text-espresso/50"} />
                <p className="font-display font-bold text-xl mt-2.5">Online Pay</p>
                <p className="text-[12.5px] font-semibold text-espresso/60 mt-1">
                  Razorpay se — UPI, card, netbanking. Ghar se hi pakka.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPay("counter")}
                className={`relative text-left rounded-2xl border-2 p-5 transition-all ${
                  pay === "counter"
                    ? "border-saffron bg-saffron/10 shadow-card"
                    : "border-espresso/15 bg-white/50 hover:border-espresso/40"
                }`}
                data-hover
              >
                {pay === "counter" && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3.5 right-3.5 grid place-items-center w-6 h-6 rounded-full bg-saffron-deep text-cream"
                  >
                    <Check size={13} strokeWidth={3.2} />
                  </motion.span>
                )}
                <ScanLine size={22} className={pay === "counter" ? "text-saffron-deep" : "text-espresso/50"} />
                <p className="font-display font-bold text-xl mt-2.5">Counter Pe</p>
                <p className="text-[12.5px] font-semibold text-espresso/60 mt-1">
                  Dukaan pe cash ya UPI. QR dikhao, bhaiya hisaab kar lenge.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* right: summary */}
        <div className="lg:sticky lg:top-24 bg-espresso-deep text-cream rounded-[1.6rem] p-6 sm:p-7 shadow-lift relative overflow-hidden">
          <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-saffron/20 blur-3xl" />
          <p className="text-[11px] font-bold tracking-[0.26em] text-gold mb-4">THAILA</p>
          <ul className="space-y-3">
            {cart.map((i) => (
              <li key={i.key} className="flex items-center gap-3">
                <img src={i.image} alt="" draggable={false} className="w-11 h-11 rounded-lg object-cover ring-1 ring-cream/20" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold truncate">
                    {i.name} <span className="text-cream/50 font-semibold">× {i.qty}</span>
                  </p>
                  <p className="text-[11px] font-semibold text-cream/50">{i.unit.label}</p>
                </div>
                <span className="font-display font-bold text-[15px]">{inr(i.unit.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 pt-4 border-t border-cream/15 space-y-2">
            <div className="flex justify-between text-sm font-semibold text-cream/70">
              <span>Sakhar ke dane</span>
              <span className="text-gold">+{grains}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-bold tracking-wide text-cream/70">KUL JOD</span>
              <span className="font-display font-black text-4xl text-gold">{inr(total)}</span>
            </div>
          </div>
          {err && <p className="text-gold text-xs font-bold mt-3">{err}</p>}
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={placing}
            className="mt-5 w-full h-14 rounded-2xl bg-saffron text-espresso-deep font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-gold transition-colors disabled:opacity-60"
            data-hover
          >
            {placing ? (
              <>
                <span className="w-5 h-5 rounded-full border-[2.5px] border-espresso-deep/30 border-t-espresso-deep animate-spin" />
                Pakka ho raha hai…
              </>
            ) : pay === "online" ? (
              <>
                Pay {inr(total)} & Order pakka <ArrowRight size={18} strokeWidth={2.6} />
              </>
            ) : (
              <>
                Order pakka karo <ArrowRight size={18} strokeWidth={2.6} />
              </>
            )}
          </motion.button>
          <p className="text-center text-[11px] font-semibold text-cream/45 mt-3">
            Order hote hi QR ban jayega — counter pe dikhana
          </p>
        </div>
      </form>
    </div>
  );
}
