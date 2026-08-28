/* ── Kapila Dairy · product grid + cards ───────────────────────────── */
import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { animate } from "animejs";
import { Plus, Star } from "lucide-react";
import { useStore } from "../lib/store";
import { CATEGORIES, inr, type Product } from "../lib/data";

gsap.registerPlugin(ScrollTrigger);

export function VegDot({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-label="Shudh shakahari">
      <rect x="1" y="1" width="18" height="18" rx="3" fill="none" stroke="#2F7D3B" strokeWidth="2" />
      <circle cx="10" cy="10" r="4.5" fill="#2F7D3B" />
    </svg>
  );
}

function ProductCard({ p }: { p: Product }) {
  const { addToCart, nav, toast } = useStore();
  const imgRef = useRef<HTMLImageElement>(null);
  const revealed = useRef(false);

  const reveal = () => {
    if (revealed.current) return;
    revealed.current = true;
    const el = imgRef.current;
    if (el) {
      animate(el, {
        clipPath: ["circle(0% at 50% 42%)", "circle(150% at 50% 50%)"],
        duration: 950,
        ease: "outExpo",
      });
    }
  };

  useLayoutEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) reveal();
  }, []);

  const minPrice = Math.min(...p.units.map((u) => u.price));

  const add = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    addToCart(
      {
        productId: p.id,
        name: p.name,
        hindi: p.hindi,
        image: p.image,
        unit: p.units[0],
        qty: 1,
      },
      e.currentTarget
    );
    toast(`${p.name} thele mein ud gaya!`, "ok");
  };

  return (
    <motion.article
      layout
      onClick={() => nav({ page: "product", id: p.id })}
      className="prod-card group relative bg-white/55 backdrop-blur-md border border-white/90 rounded-[1.4rem] shadow-card hover:shadow-lift hover:-translate-y-2 transition-all duration-500 overflow-hidden cursor-pointer"
      data-hover
    >
      {/* image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        <motion.img
          layoutId={`img-${p.id}`}
          ref={imgRef}
          src={p.image}
          alt={p.name}
          draggable={false}
          loading="lazy"
          onLoad={reveal}
          style={{ clipPath: "circle(0% at 50% 42%)" }}
          className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-700 will-change-transform"
        />
        <div className="absolute top-3 left-3 bg-cream/90 backdrop-blur rounded-lg p-1">
          <VegDot className="w-[15px] h-[15px]" />
        </div>
        {p.tag && (
          <span className="absolute top-3 right-3 bg-saffron-deep text-cream text-[10.5px] font-bold tracking-wide px-2.5 py-1 rounded-full shadow-md">
            {p.tag}
          </span>
        )}
        <span className="absolute bottom-2.5 right-3 font-hand text-xl text-cream drop-shadow-[0_2px_6px_rgba(36,20,16,0.8)]">
          {p.hindi}
        </span>
      </div>

      {/* body */}
      <div className="p-4 pb-4.5 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <motion.h3
            layoutId={`title-${p.id}`}
            className="font-display font-bold text-[19px] leading-tight text-espresso"
          >
            {p.name}
          </motion.h3>
          <span className="flex items-center gap-1 text-[12px] font-bold text-espresso/70 bg-gold/30 px-2 py-0.5 rounded-full shrink-0">
            <Star size={11} className="fill-gold-deep text-gold-deep" /> {p.rating}
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-espresso/65 line-clamp-2">{p.desc}</p>
        <div className="mt-1 pt-3 border-t border-espresso/10 flex items-center justify-between">
          <div className="leading-tight">
            <span className="font-display font-black text-lg text-espresso">{inr(minPrice)}</span>
            <span className="block text-[10.5px] font-semibold text-espresso/50">
              se shuru · {p.units[0].label}
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.82 }}
            onClick={add}
            className="flex items-center gap-1.5 bg-espresso text-cream text-[13px] font-bold pl-4 pr-3 h-10 rounded-full hover:bg-saffron-deep transition-colors shadow-md"
            data-hover
            aria-label={`${p.name} thele mein daalo`}
          >
            ADD <Plus size={15} strokeWidth={3} />
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}

const CHIPS: { id: string; label: string; hindi: string }[] = [
  { id: "all", label: "Sab Kuch", hindi: "सब" },
  ...CATEGORIES.map((c) => ({ id: c.id as string, label: c.name, hindi: c.hindi })),
];

export default function Products() {
  const { products, productsLoading, filter, setFilter } = useStore();
  const gridRef = useRef<HTMLDivElement>(null);

  const list = filter === "all" ? products : products.filter((p) => p.category === filter);

  useLayoutEffect(() => {
    if (productsLoading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".prod-card",
        { y: 46, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.09,
          scrollTrigger: { trigger: gridRef.current, start: "top 86%", once: true },
        }
      );
    }, gridRef);
    return () => ctx.revert();
  }, [filter, productsLoading]);

  return (
    <section id="menu" className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-24 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-5 mb-9">
        <div>
          <p className="flex items-center gap-3 text-[12px] font-bold tracking-[0.3em] text-saffron-deep uppercase">
            <span className="w-10 h-[2px] bg-saffron-deep inline-block" />
            Puri daftar
          </p>
          <h2 className="mt-3 font-display font-black text-5xl sm:text-6xl lg:text-7xl text-espresso leading-[0.95]">
            Aaj ki <span className="italic text-saffron-deep">taazgi</span>
          </h2>
        </div>
        <p className="font-hand text-2xl text-espresso/60 rotate-1">
          sab subah bana — shaam tak bik gaya toh gaya!
        </p>
      </div>

      {/* filter chips */}
      <div className="flex flex-wrap gap-2.5 mb-10">
        {CHIPS.map((c) => {
          const active = filter === c.id;
          return (
            <motion.button
              key={c.id}
              onClick={() => setFilter(c.id as typeof filter)}
              whileTap={{ scale: 0.94 }}
              className={`relative h-11 px-5 rounded-full text-sm font-bold transition-colors ${
                active ? "text-cream" : "text-espresso/65 hover:text-espresso bg-white/60 border border-espresso/15"
              }`}
              data-hover
            >
              {active && (
                <motion.span
                  layoutId="chip-pill"
                  className="absolute inset-0 rounded-full bg-espresso shadow-md"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {c.label}
                <span className={`text-[11px] font-hand text-base ${active ? "text-gold" : "text-espresso/40"}`}>
                  {c.hindi}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* grid */}
      <div ref={gridRef} key={filter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6">
        {productsLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[1.4rem] bg-white/50 border border-white/80 overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-sand" />
                <div className="p-4 space-y-2.5">
                  <div className="h-4 w-2/3 bg-sand rounded" />
                  <div className="h-3 w-full bg-sand/70 rounded" />
                  <div className="h-3 w-1/2 bg-sand/70 rounded" />
                  <div className="h-9 w-full bg-sand/50 rounded-full mt-3" />
                </div>
              </div>
            ))
          : list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>

      {!productsLoading && list.length === 0 && (
        <p className="text-center text-espresso/60 font-medium py-16">
          Is kone mein abhi kuch nahi — doosra kona try karo!
        </p>
      )}
    </section>
  );
}
