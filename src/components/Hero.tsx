/* ── Kapila Dairy · immersive hero + ticker ────────────────────────── */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, ArrowDown } from "lucide-react";
import { useIsMobile, usePrefersReducedMotion, useMagnetic, useMouseParallax } from "../hooks";
import { scrollToId } from "../lib/scroll";
import { FLOAT_SWEETS } from "../lib/data";

gsap.registerPlugin(ScrollTrigger);

function DropWord({ word, base, className = "" }: { word: string; base: number; className?: string }) {
  return (
    <span className={`inline-block ${className}`}>
      {word.split("").map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block will-change-transform"
          initial={{ y: -80, opacity: 0, rotate: -9 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ delay: base + i * 0.08, type: "spring", stiffness: 250, damping: 17, mass: 1 }}
        >
          {ch === " " ? "\u00A0" : ch}
        </motion.span>
      ))}
    </span>
  );
}

function FloatSweet({ src, depth, wrapper, shape, anim }: {
  src: string; depth: number; wrapper: string; shape: string; anim: string;
}) {
  const { mx, my } = useMouseParallax();
  const x = useSpring(useTransform(mx, (v) => v * -depth), { stiffness: 42, damping: 15 });
  const y = useSpring(useTransform(my, (v) => v * -depth), { stiffness: 42, damping: 15 });
  return (
    <motion.div style={{ x, y }} className={`absolute z-[5] ${wrapper}`} aria-hidden="true">
      <div className={anim}>
        <div className={`${shape} overflow-hidden shadow-lift ring-4 ring-cream/80`}>
          <img src={src} alt="" draggable={false} className="w-full h-full object-cover scale-125" loading="lazy" />
        </div>
      </div>
    </motion.div>
  );
}

function MagneticBtn({ children, onClick, variant = "solid" }: {
  children: ReactNode; onClick: () => void; variant?: "solid" | "ghost";
}) {
  const { ref, x, y } = useMagnetic<HTMLButtonElement>(0.32);
  const [rip, setRip] = useState(0);
  return (
    <motion.button
      ref={ref}
      style={{ x, y }}
      whileTap={{ scale: 0.93 }}
      onClick={() => { setRip((r) => r + 1); onClick(); }}
      data-hover
      className={`relative overflow-hidden group flex items-center gap-2.5 h-[54px] px-8 rounded-full font-bold text-[15px] tracking-wide transition-colors ${
        variant === "solid"
          ? "bg-espresso text-cream hover:bg-saffron-deep shadow-lift"
          : "border-[1.5px] border-espresso/35 text-espresso hover:border-espresso hover:bg-white/40"
      }`}
    >
      {rip > 0 && (
        <motion.span
          key={rip}
          initial={{ scale: 0.2, opacity: 0.7 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0 rounded-full bg-cream/50 pointer-events-none"
        />
      )}
      {children}
      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
    </motion.button>
  );
}

function Stat({ n, suffix, label }: { n: number; suffix: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display font-black text-3xl sm:text-4xl text-espresso leading-none">
        <span data-count={n}>0</span>
        <span className="text-saffron-deep">{suffix}</span>
      </span>
      <span className="text-[11px] font-bold tracking-[0.18em] text-espresso/55 mt-1.5 uppercase">{label}</span>
    </div>
  );
}

function DiyaDot() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" aria-hidden="true">
      <path d="M12 3c0 0-5 5.8-5 8.8a5 5 0 0 0 10 0C17 8.8 12 3 12 3Z" fill="#3E2723" />
      <path d="M5 18.5h14l-1.6 2.5H6.6L5 18.5Z" fill="#3E2723" />
    </svg>
  );
}

export function TickerStrip() {
  const items = ["Taaza Doodh", "Bilona Ghee", "Garam Jalebi", "Malai Paneer", "Kesar Peda", "Aam Lassi", "Motichoor Laddoo", "Aloo Samosa"];
  const row = [...items, ...items];
  return (
    <div className="relative z-[6] bg-saffron border-y-[3px] border-espresso-deep/90 -rotate-[0.6deg] scale-x-[1.02]">
      <div className="flex w-max animate-marquee py-3.5 gap-8 pr-8">
        {row.map((it, i) => (
          <span key={i} className="flex items-center gap-8 font-display italic font-bold text-lg sm:text-xl text-espresso-deep whitespace-nowrap">
            {it} <DiyaDot />
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  const isMobile = useIsMobile();
  const reduced = usePrefersReducedMotion();
  const statsRef = useRef<HTMLDivElement>(null);
  const heavy = !isMobile && !reduced;

  useEffect(() => {
    const els = statsRef.current?.querySelectorAll<HTMLElement>("[data-count]");
    if (!els || els.length === 0) return;
    const ctx = gsap.context(() => {
      els.forEach((el) => {
        const target = Number(el.dataset.count ?? 0);
        gsap.fromTo(el, { innerText: 0 }, {
          innerText: target, duration: 1.9, ease: "power2.out",
          snap: { innerText: 1 },
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <section id="top" className="relative min-h-[100svh] flex flex-col overflow-hidden">
      {/* milky backdrop */}
      <div className="absolute inset-0 milk-fallback" aria-hidden="true" />
      {/* animated milk blobs */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div
          animate={heavy ? { x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.15, 1] } : undefined}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-[560px] h-[560px] rounded-full bg-[radial-gradient(circle,rgba(255,247,226,0.95),rgba(255,233,194,0))]"
        />
        <motion.div
          animate={heavy ? { x: [0, -70, 0], y: [0, 50, 0], scale: [1, 1.2, 1] } : undefined}
          transition={{ duration: 19, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/3 -right-40 w-[620px] h-[620px] rounded-full bg-[radial-gradient(circle,rgba(255,217,164,0.8),rgba(255,217,164,0))]"
        />
        <motion.div
          animate={heavy ? { x: [0, 40, 0], y: [0, -60, 0] } : undefined}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,215,0,0.35),rgba(255,215,0,0))]"
        />
      </div>
      <p aria-hidden="true" className="hidden md:block absolute -right-8 top-16 font-display font-black text-[22vw] leading-none text-stroke-espresso opacity-[0.08] select-none pointer-events-none">
        दूध
      </p>

      {heavy && (
        <>
          <FloatSweet src={FLOAT_SWEETS.laddoo} depth={26} wrapper="top-[16%] right-[7%] w-36 h-36 xl:w-44 xl:h-44" shape="w-full h-full rounded-full" anim="animate-float-a w-full h-full" />
          <FloatSweet src={FLOAT_SWEETS.jamun} depth={38} wrapper="top-[52%] right-[22%] w-24 h-24 xl:w-28 xl:h-28" shape="w-full h-full rounded-full" anim="animate-float-b w-full h-full" />
          <FloatSweet src={FLOAT_SWEETS.kaju} depth={18} wrapper="top-[24%] left-[44%] w-20 h-20 xl:w-24 xl:h-24" shape="w-full h-full rounded-[28%] rotate-45" anim="animate-float-c w-full h-full -rotate-45" />
          <FloatSweet src={FLOAT_SWEETS.jalebi} depth={30} wrapper="bottom-[16%] left-[6%] w-24 h-24 xl:w-32 xl:h-32" shape="w-full h-full rounded-full" anim="animate-float-b w-full h-full" />
        </>
      )}

      <div className="relative z-[6] flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 w-full pt-28 pb-16">
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="flex items-center gap-3 text-[12px] font-bold tracking-[0.3em] text-saffron-deep uppercase"
          >
            <span className="w-10 h-[2px] bg-saffron-deep inline-block" />
            Est. 1974 · Shehar ka apna dhaaba
          </motion.p>

          <h1 className="mt-5 font-display font-black leading-[0.92] text-espresso select-none">
            <span className="block text-[19vw] sm:text-[13vw] lg:text-[8.6rem] xl:text-[10rem] tracking-tight">
              <DropWord word="Kapila" base={0.25} />
            </span>
            <span className="block text-[15vw] sm:text-[10vw] lg:text-[6.4rem] xl:text-[7.4rem] italic text-saffron-deep -mt-2 lg:-mt-4">
              <DropWord word="Dairy" base={0.62} />
            </span>
          </h1>

          <motion.div
            initial={{ opacity: 0, rotate: -14, scale: 0.7 }}
            animate={{ opacity: 1, rotate: -6, scale: 1 }}
            transition={{ delay: 1.25, type: "spring", stiffness: 180, damping: 12 }}
            className="hidden sm:flex items-center gap-2 mt-4 -ml-1"
          >
            <svg viewBox="0 0 60 40" className="w-12 h-8 text-saffron-deep" fill="none" aria-hidden="true">
              <path d="M55 4C40 8 18 10 8 30m0 0l-3-9m3 9l9-4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-hand text-2xl xl:text-3xl text-saffron-deep">subah 6 baje ki pehli malai!</span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.6 }}
            className="mt-6 max-w-md text-[15px] sm:text-base leading-relaxed text-espresso/75 font-medium"
          >
            Mithai halwai ke haath ki, doodh A2 gaay ka, ghee bilona mathne ka. Order karo ghar
            baithe — counter pe bas <b className="text-saffron-deep">QR dikhao</b> aur thaila bhar ke le jao.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15, duration: 0.6 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <MagneticBtn onClick={() => scrollToId("#menu")} variant="solid">Order Now</MagneticBtn>
            <MagneticBtn onClick={() => scrollToId("#categories")} variant="ghost">View Menu</MagneticBtn>
          </motion.div>

          <motion.div
            ref={statsRef}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.35, duration: 0.7 }}
            className="mt-14 grid grid-cols-3 gap-6 max-w-xl border-t-[2.5px] border-espresso/15 pt-6"
          >
            <Stat n={52} suffix="+" label="Saal purani recipe" />
            <Stat n={100} suffix="%" label="A2 gaay ka doodh" />
            <Stat n={5000} suffix="+" label="Khush parivaar" />
          </motion.div>
        </div>
      </div>

      <motion.button
        onClick={() => scrollToId("#categories")}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[6] flex flex-col items-center gap-1.5 text-espresso/55 hover:text-saffron-deep transition-colors"
        data-hover
        aria-label="Neeche scroll karo"
      >
        <span className="text-[10px] font-bold tracking-[0.3em] uppercase">Jhaanko</span>
        <motion.span animate={{ y: [0, 7, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
          <ArrowDown size={18} />
        </motion.span>
      </motion.button>
    </section>
  );
}
