/* ── Kapila Dairy · Sakhar ke Dane loyalty + redemption ───────────── */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Gift, Sparkles, User, X } from "lucide-react";
import { useStore } from "../lib/store";
import { REWARD_TIERS, makeOrderId } from "../lib/data";
import { RollCounter, SugarParticles } from "./fx";
import { spendDaneRemote } from "../lib/supabase";
import { scrollToId } from "../lib/scroll";

const STEPS = [
  { n: "01", t: "Order karo", d: "jitna chaaho, jitna khao" },
  { n: "02", t: "Dane judo", d: "har ₹10 pe 1 sakhar ka dana" },
  { n: "03", t: "Inaam uthao", d: "counter pe dana dikhao, mithai lo" },
];

export default function Rewards() {
  const { customer, setLoginOpen, patchCustomer, placeOrder, toast } = useStore();
  const points = customer?.dane ?? 0;
  const [redeeming, setRedeeming] = useState<{ grains: number; reward: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const nextTier = REWARD_TIERS.find((t) => t.grains > points);
  const barPct = Math.min(100, Math.round((points / 1000) * 100));

  const confirmRedeem = async () => {
    if (!customer || !redeeming) return;
    setBusy(true);
    const serverTotal = customer.authed ? await spendDaneRemote(redeeming.grains) : null;
    const newDane = serverTotal ?? Math.max(0, customer.dane - redeeming.grains);
    patchCustomer({ dane: newDane });
    placeOrder({
      id: makeOrderId(), createdAt: new Date().toISOString(),
      customerName: customer.name, phone: customer.phone, pickup: "Counter se",
      items: [], total: 0, payment: "redeem", paid: true, grainsEarned: 0,
      redeem: { reward: redeeming.reward, daneSpent: redeeming.grains },
    });
    setBusy(false);
    setRedeeming(null);
    toast(`${redeeming.reward} aapka! QR dikhao aur le jao.`, "ok");
  };

  return (
    <section id="rewards" className="relative bg-espresso-deep text-cream overflow-hidden py-24 sm:py-28">
      <SugarParticles density={42} />
      <p aria-hidden="true" className="absolute -top-6 right-0 font-display font-black text-[26vw] leading-none text-stroke-cream opacity-[0.06] select-none pointer-events-none">दाना</p>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <div>
            <p className="flex items-center gap-3 text-[12px] font-bold tracking-[0.3em] text-gold uppercase">
              <span className="w-10 h-[2px] bg-gold inline-block" /> Loyalty, dhaabe style
            </p>
            <h2 className="mt-4 font-display font-black text-5xl sm:text-6xl lg:text-7xl leading-[0.95]">
              Sakhar ke <span className="italic text-saffron">dane</span>
            </h2>
            <p className="mt-5 max-w-lg text-cream/70 text-[15px] leading-relaxed font-medium">
              Har <b className="text-gold">₹10</b> ki khareedari pe <b className="text-gold">1 sakhar ka dana</b>.
              Khata email se khulta hai — naam aur number bas. Dane jama karo, aur jab ginni puri
              ho jaye, counter pe QR dikhao aur inaam <b className="text-gold">FREE</b> uthao.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:gap-3 items-stretch sm:items-center">
              {STEPS.map((s, i) => (
                <div key={s.n} className="flex items-center gap-3">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
                    transition={{ delay: i * 0.15, duration: 0.5 }}
                    className="bg-cream/8 border border-cream/15 rounded-2xl px-5 py-3.5 flex-1 sm:flex-none"
                  >
                    <p className="font-display font-black text-gold text-sm">{s.n}</p>
                    <p className="font-bold text-[15px] mt-0.5">{s.t}</p>
                    <p className="text-[11.5px] font-semibold text-cream/50">{s.d}</p>
                  </motion.div>
                  {i < STEPS.length - 1 && <span className="hidden sm:block font-hand text-3xl text-saffron">→</span>}
                </div>
              ))}
            </div>
            {!customer && (
              <motion.button
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                whileTap={{ scale: 0.96 }} onClick={() => setLoginOpen(true)}
                className="mt-8 flex items-center gap-2.5 bg-saffron text-espresso-deep font-bold px-7 h-14 rounded-full hover:bg-gold transition-colors shadow-lift"
                data-hover
              >
                <User size={18} /> Khata kholo — dane kamao <ArrowRight size={17} />
              </motion.button>
            )}
          </div>

          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 30, rotate: -1 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true, margin: "-60px" }}
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
                  <span className="text-saffron-deep">{nextTier ? `agli khushi: ${nextTier.grains} dane` : "sabse aage!"}</span>
                  <span>1000</span>
                </div>
                <div className="h-3 bg-sand rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }} whileInView={{ width: `${barPct}%` }} viewport={{ once: true }}
                    transition={{ delay: 0.4, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-saffron-deep via-saffron to-gold"
                  />
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-3.5">
              {REWARD_TIERS.map((t, i) => {
                const achieved = points >= t.grains;
                return (
                  <motion.div
                    key={t.grains}
                    initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
                    transition={{ delay: i * 0.1, duration: 0.55 }}
                    whileHover={{ y: -5 }}
                    className={`relative rounded-2xl p-5 border transition-colors ${achieved ? "bg-gold/15 border-gold/70" : "bg-cream/6 border-cream/12 hover:border-cream/30"}`}
                  >
                    {achieved && (
                      <button
                        onClick={() => customer && setRedeeming({ grains: t.grains, reward: t.reward })}
                        className="absolute top-3 right-3 grid place-items-center w-7 h-7 rounded-full bg-gold text-espresso-deep hover:scale-110 transition-transform"
                        data-hover title="Inaam lo"
                      >
                        <Gift size={14} />
                      </button>
                    )}
                    <p className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-gold" />
                      <span className="font-display font-black text-3xl text-gold">{t.grains}</span>
                      <span className="text-[11px] font-bold text-cream/50 tracking-wider">DANE</span>
                    </p>
                    <p className="font-bold text-[15px] mt-2 leading-tight">{t.reward}</p>
                    <p className="font-hand text-lg text-saffron mt-0.5">{t.hindi}</p>
                    {achieved && <p className="text-[10px] font-bold text-gold mt-1.5 flex items-center gap-1"><Check size={11} /> Inaam ke layak!</p>}
                  </motion.div>
                );
              })}
            </div>

            {customer && (
              <button onClick={() => scrollToId("#menu")} className="w-full py-3.5 rounded-2xl border-[1.5px] border-cream/25 text-cream/80 font-bold hover:border-gold hover:text-gold transition-colors flex items-center justify-center gap-2" data-hover>
                Aur dane kamao <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* redeem confirm */}
      <AnimatePresence>
        {redeeming && customer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRedeeming(null)} className="fixed inset-0 z-[86] bg-espresso-deep/70 backdrop-blur-sm" />
            <div className="fixed inset-0 z-[87] grid place-items-center p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="pointer-events-auto w-full max-w-sm bg-cream text-espresso rounded-[1.6rem] p-7 shadow-lift border border-gold/50 text-center relative overflow-hidden"
              >
                <button onClick={() => setRedeeming(null)} className="absolute top-4 right-4 w-9 h-9 grid place-items-center rounded-full border border-espresso/20 hover:bg-espresso hover:text-cream transition-colors" data-hover aria-label="Band"><X size={16} /></button>
                <motion.span animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 2.4, repeat: Infinity }} className="mx-auto grid place-items-center w-16 h-16 rounded-full bg-gold/30 mb-3">
                  <Gift size={30} className="text-gold-deep" />
                </motion.span>
                <h3 className="font-display font-black text-3xl">Inaam pakka?</h3>
                <p className="font-hand text-2xl text-saffron-deep mt-1">{redeeming.reward}</p>
                <p className="text-sm font-semibold text-espresso/65 mt-3">
                  <b className="text-saffron-deep">{redeeming.grains} dane</b> katenge, aur yeh inaam{" "}
                  <b className="text-leaf">₹0 — FREE</b> milega.
                </p>
                <p className="text-[12px] font-semibold text-espresso/50 mt-1.5">Khate mein {customer.dane} dane hain.</p>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => void confirmRedeem()} disabled={busy} className="mt-5 w-full h-13 py-3.5 rounded-xl bg-leaf text-cream font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-60" data-hover>
                  {busy ? "Ho raha hai…" : <>Haan, inaam do! <Check size={17} strokeWidth={3} /></>}
                </motion.button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
