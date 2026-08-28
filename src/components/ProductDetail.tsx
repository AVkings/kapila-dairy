/* ── Kapila Dairy · product detail (shared-element transition) ────── */
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Minus, Plus, Star, ShoppingBag, Zap } from "lucide-react";
import { useStore } from "../lib/store";
import { inr, type UnitOption } from "../lib/data";
import { VegDot } from "./Products";

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
                <span className={`ml-2 ${i === unitIdx ? "text-gold" : "text-saffron-deep"}`}>
                  {inr(u.price)}
                </span>
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
                    <p className="text-xs font-semibold text-espresso/55 mt-0.5">
                      {inr(r.units[0].price)} se
                    </p>
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
