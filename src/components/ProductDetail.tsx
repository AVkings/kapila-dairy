/* ── Kapila Dairy · product detail: heritage + craft + purity ──────── */
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Leaf, Minus, Plus, ShieldCheck, Star, ShoppingBag, Zap } from "lucide-react";
import { useStore } from "../lib/store";
import { inr, type UnitOption } from "../lib/data";
import { VegDot } from "./Products";

/* rotating purity seal */
function PuritySeal({ since }: { since: number }) {
  return (
    <div className="relative w-32 h-32 sm:w-40 sm:h-40 shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full animate-spin-slow" aria-hidden="true">
        <defs>
          <path id="sealcircle" d="M 60,60 m -44,0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0" />
        </defs>
        <circle cx="60" cy="60" r="57" fill="#FF9933" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="#FFFEF0" strokeWidth="1.2" strokeDasharray="3 4" />
        <text fill="#3E2723" fontSize="10.5" fontWeight="800" letterSpacing="2.5">
          <textPath href="#sealcircle">
            100% SHUDDH · KAPILA DAIRY · NO PRESERVATIVES ·
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <p className="font-display font-black text-espresso text-[26px]">{since}</p>
          <p className="text-[8px] font-bold tracking-[0.3em] text-espresso/70 mt-1">SINCE</p>
        </div>
      </div>
    </div>
  );
}

const reveal = {
  initial: { opacity: 0, y: 34 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
};

export default function ProductDetail({ id }: { id: string }) {
  const { products, addToCart, nav, toast } = useStore();
  const p = products.find((x) => x.id === id);
  const [unitIdx, setUnitIdx] = useState(0);
  const [qty, setQty] = useState(1);

  if (!p) {
    return (
      <div className="min-h-[70vh] grid place-items-center pt-24">
        <div className="text-center">
          <p className="font-display font-black text-3xl">Yeh cheez nahi mili ji!</p>
          <button
            onClick={() => nav({ page: "home" })}
            className="mt-5 bg-espresso text-cream font-bold px-6 h-12 rounded-full"
            data-hover
          >
            Wapas dhaabe pe
          </button>
        </div>
      </div>
    );
  }

  const unit: UnitOption = p.units[unitIdx];
  const total = unit.price * qty;
  const related = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 3);

  const add = (sourceEl: HTMLElement | null, thenCheckout = false) => {
    addToCart(
      { productId: p.id, name: p.name, hindi: p.hindi, image: p.image, unit, qty },
      sourceEl
    );
    if (thenCheckout) {
      window.setTimeout(() => nav({ page: "checkout" }), 320);
    } else {
      toast(`${qty} × ${p.name} (${unit.label}) thele mein!`, "ok");
    }
  };

  return (
    <div className="pt-24 sm:pt-28 pb-20 max-w-6xl mx-auto px-5 sm:px-8">
      <button
        onClick={() => nav({ page: "home" })}
        className="group flex items-center gap-2 text-sm font-bold text-espresso/60 hover:text-saffron-deep transition-colors mb-7"
        data-hover
      >
        <ArrowLeft size={17} className="group-hover:-translate-x-1 transition-transform" />
        Wapas daftar pe
      </button>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-14 items-start">
        {/* image */}
        <div className="relative">
          <motion.img
            layoutId={`img-${p.id}`}
            src={p.image}
            alt={p.name}
            draggable={false}
            className="w-full aspect-[4/3] object-cover rounded-[2rem] shadow-lift ring-1 ring-white"
          />
          {p.tag && (
            <span className="absolute top-5 right-5 bg-saffron-deep text-cream text-xs font-bold tracking-wide px-3.5 py-1.5 rounded-full shadow-lg">
              {p.tag}
            </span>
          )}
          <div className="absolute bottom-5 left-5 flex items-center gap-2 bg-cream/90 backdrop-blur rounded-full pl-2.5 pr-4 py-1.5 shadow-md">
            <VegDot className="w-[15px] h-[15px]" />
            <span className="text-xs font-bold text-espresso/75">Shudh shakahari</span>
          </div>
        </div>

        {/* info */}
        <div>
          <p className="font-hand text-3xl text-saffron-deep">{p.hindi}</p>
          <motion.h1
            layoutId={`title-${p.id}`}
            className="font-display font-black text-5xl sm:text-6xl text-espresso leading-[0.98] mt-1"
          >
            {p.name}
          </motion.h1>

          <div className="flex items-center gap-3 mt-4">
            <span className="flex items-center gap-1.5 bg-gold/30 px-3 py-1 rounded-full text-sm font-bold text-espresso">
              <Star size={14} className="fill-gold-deep text-gold-deep" /> {p.rating}
            </span>
            <span className="text-sm font-semibold text-espresso/50">{p.reviews} logon ne pyaar diya</span>
          </div>

          <p className="mt-5 text-[15px] leading-relaxed text-espresso/75">{p.desc}</p>

          <div className="mt-5 relative bg-parchment/80 border border-gold/40 rounded-2xl p-5">
            <span className="absolute -top-3 left-5 bg-cream px-2.5 py-0.5 rounded-full border border-gold/50 text-[10px] font-bold tracking-[0.22em] text-gold-deep">
              HALWAI KI ZUBANI
            </span>
            <p className="font-hand text-2xl leading-snug text-espresso/85">{p.story}</p>
          </div>

          {/* unit picker */}
          <p className="mt-7 text-[11px] font-bold tracking-[0.24em] text-espresso/55">PACK CHUNO</p>
          <div className="mt-2.5 flex flex-wrap gap-2.5">
            {p.units.map((u, i) => (
              <motion.button
                key={u.label}
                whileTap={{ scale: 0.94 }}
                onClick={() => setUnitIdx(i)}
                className={`relative h-12 px-5 rounded-2xl border-[1.5px] text-sm font-bold transition-colors ${
                  i === unitIdx
                    ? "border-espresso bg-espresso text-cream shadow-md"
                    : "border-espresso/25 bg-white/60 text-espresso/75 hover:border-espresso/60"
                }`}
                data-hover
              >
                {u.label}
                <span className={`ml-2 ${i === unitIdx ? "text-gold" : "text-saffron-deep"}`}>{inr(u.price)}</span>
              </motion.button>
            ))}
          </div>

          {/* qty + total */}
          <div className="mt-6 flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-1.5 bg-white/70 border-[1.5px] border-espresso/20 rounded-full p-1">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 grid place-items-center rounded-full hover:bg-saffron hover:text-cream transition-colors"
                data-hover
                aria-label="Kam"
              >
                <Minus size={16} strokeWidth={3} />
              </button>
              <motion.span
                key={qty}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="w-9 text-center font-display font-black text-xl"
              >
                {qty}
              </motion.span>
              <button
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                className="w-10 h-10 grid place-items-center rounded-full hover:bg-saffron hover:text-cream transition-colors"
                data-hover
                aria-label="Zyaada"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>
            <div>
              <motion.p
                key={total}
                initial={{ scale: 0.85, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-display font-black text-4xl text-espresso"
              >
                {inr(total)}
              </motion.p>
              <p className="text-[11px] font-semibold text-espresso/50">
                {qty} × {unit.label} · +{Math.floor(total / 10)} sakhar ke dane
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap gap-3.5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => add(e.currentTarget)}
              className="flex items-center gap-2.5 bg-espresso text-cream font-bold text-[15px] px-7 h-14 rounded-full hover:bg-saffron-deep transition-colors shadow-lift"
              data-hover
            >
              <ShoppingBag size={18} /> Thele mein daalo
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => add(e.currentTarget, true)}
              className="flex items-center gap-2.5 bg-saffron text-espresso-deep font-bold text-[15px] px-7 h-14 rounded-full hover:bg-gold transition-colors shadow-card"
              data-hover
            >
              <Zap size={18} className="fill-espresso-deep" /> Seedha checkout
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── VIRASAT · the heritage story ── */}
      <motion.section
        {...reveal}
        className="mt-16 sm:mt-20 relative bg-espresso-deep text-cream rounded-[2rem] overflow-hidden p-8 sm:p-12"
      >
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-saffron/15 blur-3xl" />
        <p
          aria-hidden="true"
          className="absolute -bottom-10 right-2 font-display font-black text-[9rem] leading-none text-stroke-cream opacity-[0.07] select-none pointer-events-none"
        >
          {p.hindi.slice(0, 2)}
        </p>
        <div className="relative flex flex-col sm:flex-row gap-8 sm:gap-12 items-start">
          <PuritySeal since={p.since} />
          <div className="max-w-2xl">
            <p className="flex items-center gap-3 text-[11px] font-bold tracking-[0.3em] text-gold uppercase">
              <span className="w-9 h-[2px] bg-gold inline-block" /> Virasat · {p.since} se
            </p>
            <h2 className="font-display font-black text-4xl sm:text-5xl leading-[1.02] mt-3">
              Teen peedhi ki <span className="italic text-saffron">imaandari</span>
            </h2>
            <p className="mt-5 text-cream/80 text-[15px] sm:text-base leading-relaxed">{p.heritage}</p>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              {[
                { k: `${new Date().getFullYear() - p.since}+`, v: "saal purani recipe" },
                { k: "0", v: "preservatives, hamesha" },
                { k: "100%", v: "haath ki banawat" },
              ].map((s) => (
                <div key={s.v}>
                  <p className="font-display font-black text-3xl text-gold leading-none">{s.k}</p>
                  <p className="text-[11px] font-bold tracking-wide text-cream/55 uppercase mt-1">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── KAISE BANTI HAI · craft timeline ── */}
      <section className="mt-16 sm:mt-20">
        <motion.div {...reveal}>
          <p className="flex items-center gap-3 text-[12px] font-bold tracking-[0.3em] text-saffron-deep uppercase">
            <span className="w-10 h-[2px] bg-saffron-deep inline-block" /> Karigari
          </p>
          <h2 className="mt-3 font-display font-black text-4xl sm:text-5xl text-espresso leading-[0.98]">
            Kaise banti hai <span className="italic text-saffron-deep">yeh</span>
          </h2>
        </motion.div>

        <div className="mt-9 relative">
          <span className="absolute left-[21px] top-3 bottom-3 w-[2.5px] bg-gradient-to-b from-saffron via-gold-deep/60 to-transparent rounded-full" />
          <ol className="space-y-5">
            {p.craft.map((step, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -26 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex gap-5 items-start"
              >
                <span className="relative z-10 grid place-items-center w-11 h-11 rounded-full bg-espresso text-gold font-display font-black text-lg shadow-md ring-4 ring-cream shrink-0">
                  {i + 1}
                </span>
                <div className="bg-white/70 border border-white rounded-2xl px-5 py-4 shadow-card flex-1 group hover:-translate-y-1 hover:shadow-lift transition-all">
                  <p className="font-hand text-xl text-saffron-deep leading-none">
                    {["Subah ka pehla kaam", "Beech ka sabra wala kaam", "Haath ki hunarmandi", "Aakhri nazaakat"][i] ??
                      `Step ${i + 1}`}
                  </p>
                  <p className="font-semibold text-espresso/85 text-[15px] mt-1.5 leading-relaxed">{step}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── SHUDDHTA KA VAADA · purity promises ── */}
      <section className="mt-16 sm:mt-20">
        <div className="grid md:grid-cols-[auto_1fr] gap-8 items-center">
          <motion.div {...reveal}>
            <p className="flex items-center gap-3 text-[12px] font-bold tracking-[0.3em] text-leaf uppercase">
              <span className="w-10 h-[2px] bg-leaf inline-block" /> Vaada
            </p>
            <h2 className="mt-3 font-display font-black text-4xl sm:text-5xl text-espresso leading-[0.98]">
              Shuddhta ka <span className="italic text-leaf">vaada</span>
            </h2>
            <p className="font-hand text-2xl text-espresso/60 mt-3">jo toota, woh dhaaba band!</p>
          </motion.div>
          <div className="flex flex-wrap gap-3">
            {p.purity.map((pr, i) => (
              <motion.span
                key={pr}
                initial={{ opacity: 0, scale: 0.7, y: 14 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.09, type: "spring", stiffness: 320, damping: 20 }}
                whileHover={{ y: -4 }}
                className="flex items-center gap-2 bg-white/80 border-[1.5px] border-leaf/35 text-espresso font-bold text-[14px] px-5 py-3 rounded-full shadow-sm hover:border-leaf hover:shadow-card transition-all"
              >
                <ShieldCheck size={17} className="text-leaf shrink-0" />
                {pr}
              </motion.span>
            ))}
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: p.purity.length * 0.09, type: "spring", stiffness: 320, damping: 20 }}
              whileHover={{ y: -4 }}
              className="flex items-center gap-2 bg-leaf text-cream font-bold text-[14px] px-5 py-3 rounded-full shadow-card"
            >
              <Leaf size={16} /> Bina preservative — 1974 se
            </motion.span>
          </div>
        </div>
      </section>

      {/* related */}
      {related.length > 0 && (
        <div className="mt-16">
          <p className="font-hand text-3xl text-saffron-deep mb-4">saath mein kuch aur?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <motion.button
                key={r.id}
                whileHover={{ y: -5 }}
                onClick={() => nav({ page: "product", id: r.id })}
                className="group text-left bg-white/60 border border-white rounded-2xl overflow-hidden shadow-card hover:shadow-lift transition-shadow"
                data-hover
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={r.image}
                    alt={r.name}
                    draggable={false}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <div className="p-3.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-display font-bold text-[15px] leading-tight">{r.name}</p>
                    <p className="text-xs font-semibold text-espresso/55 mt-0.5">{inr(r.units[0].price)} se</p>
                  </div>
                  <span className="grid place-items-center w-8 h-8 rounded-full bg-saffron/20 text-saffron-deep group-hover:bg-saffron group-hover:text-cream transition-colors shrink-0">
                    <Plus size={15} strokeWidth={3} />
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
