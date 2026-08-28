/* ── Kapila Dairy · Sakhar ke Dane loyalty + redemption ────────────── */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Gift, Sparkles, User, X } from "lucide-react";
import confetti from "canvas-confetti";
import { useStore } from "../lib/store";
import { makeOrderId, REWARD_TIERS, type Order, type RewardTier } from "../lib/data";
import { spendDaneRemote } from "../lib/supabase";
import { RollCounter, SugarParticles } from "./MotionBits";
import { scrollToId } from "../lib/scroll";

const STEPS = [
  { n: "01", t: "Order karo", d: "jitna chaaho, jitna khao" },
  { n: "02", t: "Dane judo", d: "har ₹10 pe 1 sakhar ka dana" },
  { n: "03", t: "Inaam uthao", d: "dane se FREE order, QR dikhao" },
];

export default function Rewards() {
  const { customer, setLoginOpen, patchCustomer, nav, placeOrder, toast } = useStore();
  const points = customer?.dane ?? 0;
  const nextTier = REWARD_TIERS.find((t) => t.grains > points);
  const barPct = Math.min(100, Math.round((points / 1000) * 100));

  const [confirmTier, setConfirmTier] = useState<RewardTier | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const startRedeem = (t: RewardTier) => {
    if (!customer) {
      setLoginOpen(true);
      return;
    }
    setConfirmTier(t);
  };

  const doRedeem = async () => {
    if (!confirmTier || !customer || redeeming) return;
    setRedeeming(true);

    // 1. deduct dane server-side (safe RPC)
    const newBalance = await spendDaneRemote(confirmTier.grains);
    if (newBalance === null) {
      setRedeeming(false);
      setConfirmTier(null);
      toast("Dane kat nahi paaye — dobara try karo.", "warn");
      return;
    }
    patchCustomer({ dane: newBalance });

    // 2. build the FREE reward order (no cost charged)
    const order: Order = {
      id: makeOrderId(),
      createdAt: new Date().toISOString(),
      customerName: customer.name,
      phone: customer.phone,
      pickup: "Aaj — counter se",
      items: [
        {
          key: `redeem-${confirmTier.grains}`,
          productId: `reward-${confirmTier.grains}`,
          name: confirmTier.reward,
          hindi: confirmTier.hindi,
          image: confirmTier.img,
          unit: { label: "FREE Inaam", price: 0 },
          qty: 1,
        },
      ],
      total: 0,
      payment: "redeem",
      paid: true,
      grainsEarned: 0,
      redeem: { reward: confirmTier.reward, daneSpent: confirmTier.grains },
    };

    placeOrder(order);
    setRedeeming(false);
    setConfirmTier(null);

    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.6 },
      colors: ["#FF9933", "#FFD700", "#FFFEF0"],
    });
    nav({ page: "success", order });
  };

  return (
    <section
      id="rewards"
      className="relative bg-espresso-deep text-cream overflow-hidden py-24 sm:py-28"
    >
      <SugarParticles id="rewards-sugar" className="absolute inset-0" />
      <p
        aria-hidden="true"
        className="absolute -top-6 right-0 font-display font-black text-[26vw] leading-none text-stroke-cream opacity-[0.06] select-none pointer-events-none"
      >
        दाना
      </p>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          {/* left: pitch */}
          <div>
            <p className="flex items-center gap-3 text-[12px] font-bold tracking-[0.3em] text-gold uppercase">
              <span className="w-10 h-[2px] bg-gold inline-block" />
              Loyalty, dhaabe style
            </p>
            <h2 className="mt-4 font-display font-black text-5xl sm:text-6xl lg:text-7xl leading-[0.95]">
              Sakhar ke{" "}
              <span className="italic text-saffron">dane</span>
            </h2>
            <p className="mt-5 max-w-lg text-cream/70 text-[15px] leading-relaxed font-medium">
              Har <b className="text-gold">₹10</b> ki khareedari pe <b className="text-gold">1 sakhar ka dana</b>.
              Khata phone OTP se khulta hai — naam aur number bas. Dane jama karo, aur jab ginni
              puri ho jaye, counter pe QR dikhao aur inaam uthao.
            </p>

            {/* steps */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:gap-3 items-stretch sm:items-center">
              {STEPS.map((s, i) => (
                <div key={s.n} className="flex items-center gap-3">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ delay: i * 0.15, duration: 0.5 }}
                    className="bg-cream/8 border border-cream/15 rounded-2xl px-5 py-3.5 flex-1 sm:flex-none"
                  >
                    <p className="font-display font-black text-gold text-sm">{s.n}</p>
                    <p className="font-bold text-[15px] mt-0.5">{s.t}</p>
                    <p className="text-[11.5px] font-semibold text-cream/50">{s.d}</p>
                  </motion.div>
                  {i < STEPS.length - 1 && (
                    <span className="hidden sm:block font-hand text-3xl text-saffron rotate-0">→</span>
                  )}
                </div>
              ))}
            </div>

            {!customer && (
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setLoginOpen(true)}
                className="mt-8 flex items-center gap-2.5 bg-saffron text-espresso-deep font-bold px-7 h-14 rounded-full hover:bg-gold transition-colors shadow-lift"
                data-hover
              >
                <User size={18} /> Khata kholo — dane kamao <ArrowRight size={17} />
              </motion.button>
            )}
          </div>

          {/* right: khata + tiers */}
          <div className="space-y-5">
            {/* current points card */}
            <motion.div
              initial={{ opacity: 0, y: 30, rotate: -1 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="bg-cream text-espresso rounded-[1.6rem] p-6 sm:p-7 shadow-lift"
            >
              <p className="text-[11px] font-bold tracking-[0.26em] text-espresso/50">
                {customer ? `${customer.name.split(" ")[0].toUpperCase()} JI KA KHATA` : "AAPKA KHATA (ABHI KHALI)"}
              </p>
              <div className="flex items-baseline gap-2.5 mt-2">
                <RollCounter value={points} className="font-display font-black text-6xl sm:text-7xl text-saffron-deep" />
                <span className="font-display font-bold text-xl text-espresso/70">dane</span>
              </div>
              <div className="mt-5">
                <div className="flex justify-between text-[11px] font-bold text-espresso/55 mb-1.5">
                  <span>0</span>
                  <span className="text-saffron-deep">
                    {nextTier ? `agli khushi: ${nextTier.grains} dane` : "sabse aage!"}
                  </span>
                  <span>1000</span>
                </div>
                <div className="h-3 bg-sand rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${barPct}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-saffron-deep via-saffron to-gold"
                  />
                  {REWARD_TIERS.map((t) => (
                    <span
                      key={t.grains}
                      className="absolute top-1/2 -translate-y-1/2 w-[3px] h-4 bg-espresso/25 rounded"
                      style={{ left: `${(t.grains / 1000) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* tiers */}
            <div className="grid grid-cols-2 gap-3.5">
              {REWARD_TIERS.map((t, i) => {
                const achieved = points >= t.grains;
                return (
                  <motion.div
                    key={t.grains}
                    initial={{ opacity: 0, y: 26 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ delay: i * 0.1, duration: 0.55 }}
                    whileHover={{ y: -5 }}
                    className={`relative rounded-2xl p-5 border transition-colors ${
                      achieved
                        ? "bg-gold/15 border-gold/70"
                        : "bg-cream/6 border-cream/12 hover:border-cream/30"
                    }`}
                  >
                    {achieved && (
                      <span className="absolute top-3.5 right-3.5 grid place-items-center w-6 h-6 rounded-full bg-gold text-espresso-deep">
                        <Check size={13} strokeWidth={3.4} />
                      </span>
                    )}
                    <p className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-gold" />
                      <span className="font-display font-black text-3xl text-gold">{t.grains}</span>
                      <span className="text-[11px] font-bold text-cream/50 tracking-wider">DANE</span>
                    </p>
                    <p className="font-bold text-[15px] mt-2 leading-tight">{t.reward}</p>
                    <p className="font-hand text-lg text-saffron mt-0.5">{t.hindi}</p>

                    {achieved ? (
                      <button
                        onClick={() => startRedeem(t)}
                        className="mt-3 w-full h-10 rounded-xl bg-gold text-espresso-deep text-[13px] font-bold flex items-center justify-center gap-1.5 hover:bg-saffron transition-colors"
                        data-hover
                      >
                        <Gift size={15} /> Inaam lo — FREE
                      </button>
                    ) : (
                      <p className="mt-3 text-[11px] font-semibold text-cream/40 text-center">
                        {t.grains - points} dane aur chahiye
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {customer && (
              <button
                onClick={() => scrollToId("#menu")}
                className="w-full h-13 py-3.5 rounded-2xl border-[1.5px] border-cream/25 text-cream/80 font-bold hover:border-gold hover:text-gold transition-colors flex items-center justify-center gap-2"
                data-hover
              >
                Aur dane kamao <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* redemption confirm modal */}
      <AnimatePresence>
        {confirmTier && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !redeeming && setConfirmTier(null)}
              className="fixed inset-0 z-[86] bg-espresso-deep/70 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-[87] grid place-items-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 26 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 16 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="pointer-events-auto w-full max-w-sm bg-cream text-espresso rounded-[1.6rem] p-6 shadow-lift border border-gold/50 relative overflow-hidden"
              >
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gold/25 blur-2xl" />
                <button
                  onClick={() => !redeeming && setConfirmTier(null)}
                  className="absolute top-4 right-4 w-9 h-9 grid place-items-center rounded-full border border-espresso/20 hover:bg-espresso hover:text-cream transition-colors"
                  data-hover
                  aria-label="Band karo"
                >
                  <X size={16} />
                </button>

                <div className="flex items-center gap-4">
                  <img
                    src={confirmTier.img}
                    alt={confirmTier.reward}
                    draggable={false}
                    className="w-20 h-20 rounded-2xl object-cover ring-2 ring-gold shadow-card"
                  />
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.22em] text-saffron-deep">DANE KA INAAM</p>
                    <h3 className="font-display font-black text-2xl leading-tight mt-1">{confirmTier.reward}</h3>
                    <p className="font-hand text-lg text-saffron-deep">{confirmTier.hindi}</p>
                  </div>
                </div>

                <div className="mt-5 bg-sand/60 border border-gold-deep/25 rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-between">
                  <span className="text-espresso/70">Kharch honge</span>
                  <span className="font-display font-black text-xl text-saffron-deep">
                    −{confirmTier.grains} dane
                  </span>
                </div>
                <div className="mt-2 bg-sand/60 border border-gold-deep/25 rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-between">
                  <span className="text-espresso/70">Aapko dena hoga</span>
                  <span className="font-display font-black text-xl text-leaf">₹0 — FREE</span>
                </div>

                <p className="text-[12px] text-espresso/55 text-center mt-4 leading-relaxed">
                  Counter pe QR dikhao, bhaiya inaam thama denge.
                  <br />
                  Ek rupaya nahi lagega!
                </p>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setConfirmTier(null)}
                    disabled={redeeming}
                    className="flex-1 h-12 rounded-xl border-[1.5px] border-espresso/25 font-bold text-espresso/70 hover:bg-sand/50 transition-colors disabled:opacity-50"
                    data-hover
                  >
                    Nahi
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={doRedeem}
                    disabled={redeeming}
                    className="flex-1 h-12 rounded-xl bg-saffron-deep text-cream font-bold flex items-center justify-center gap-2 hover:bg-espresso transition-colors disabled:opacity-60"
                    data-hover
                  >
                    {redeeming ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-cream/30 border-t-cream animate-spin" />
                        Dane kat rahe…
                      </>
                    ) : (
                      <>
                        <Gift size={16} /> Pakka karo
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
