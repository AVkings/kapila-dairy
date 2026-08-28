/* ── Kapila Dairy · Sakhar ke Dane loyalty section ─────────────────── */
import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles, User } from "lucide-react";
import { useStore } from "../lib/store";
import { REWARD_TIERS } from "../lib/data";
import { RollCounter, SugarParticles } from "./MotionBits";
import { scrollToId } from "../lib/scroll";

const STEPS = [
  { n: "01", t: "Order karo", d: "jitna chaaho, jitna khao" },
  { n: "02", t: "Dane judo", d: "har ₹10 pe 1 sakhar ka dana" },
  { n: "03", t: "Inaam uthao", d: "counter pe dana dikhao, mithai lo" },
];

export default function Rewards() {
  const { customer, setLoginOpen } = useStore();
  const points = customer?.dane ?? 0;
  const nextTier = REWARD_TIERS.find((t) => t.grains > points);
  const barPct = Math.min(100, Math.round((points / 1000) * 100));

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
    </section>
  );
}
