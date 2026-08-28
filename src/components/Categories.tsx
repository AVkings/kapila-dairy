/* ── Kapila Dairy · horizontal-pinned category rail ────────────────── */
import { useLayoutEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight } from "lucide-react";
import { CATEGORIES, type CategoryInfo } from "../lib/data";
import { useStore } from "../lib/store";
import { scrollToId } from "../lib/scroll";
import { useIsMobile, usePrefersReducedMotion } from "../hooks";

gsap.registerPlugin(ScrollTrigger);

function CategoryCard({ c, index }: { c: CategoryInfo; index: number }) {
  const { setFilter } = useStore();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 160, damping: 16 });
  const sry = useSpring(ry, { stiffness: 160, damping: 16 });
  const sheenX = useTransform(ry, (v) => `${50 + v * 4}%`);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    rx.set((0.5 - py) * 10);
    ry.set((px - 0.5) * 12);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  const go = () => {
    setFilter(c.id);
    scrollToId("#menu");
  };

  return (
    <div style={{ perspective: 900 }} className="shrink-0 w-[80vw] sm:w-[400px] lg:w-[430px]">
      <motion.div
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={go}
        style={{ rotateX: srx, rotateY: sry, transformStyle: "preserve-3d" }}
        whileHover={{ y: -8 }}
        className="group relative h-[440px] lg:h-[480px] rounded-[1.8rem] overflow-hidden shadow-card hover:shadow-lift transition-shadow duration-500 cursor-pointer border border-white/60"
        data-hover
      >
        {/* slow-zoom image */}
        <img
          src={c.image}
          alt={c.name}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-[1.16] transition-transform duration-[2400ms] ease-out will-change-transform"
          loading="lazy"
        />
        {/* holo sheen sweep */}
        <motion.div
          style={{ backgroundPositionX: sheenX }}
          className="holo-sheen absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-screen pointer-events-none"
        />
        {/* depth gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-espresso-deep/95 via-espresso-deep/25 to-transparent" />

        {/* number */}
        <span
          className="absolute top-5 right-6 font-display font-black text-7xl text-stroke-cream opacity-50"
          style={{ transform: "translateZ(40px)" }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* content */}
        <div className="absolute bottom-0 inset-x-0 p-7" style={{ transform: "translateZ(50px)" }}>
          <p className="font-hand text-2xl text-gold mb-1">{c.hindi}</p>
          <h3 className="font-display font-black text-cream text-[34px] leading-none">{c.name}</h3>
          <p className="mt-3 text-cream/75 text-sm leading-relaxed max-w-[300px]">{c.desc}</p>
          <div className="mt-5 flex items-center justify-between">
            <span
              className="px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider text-cream"
              style={{ background: c.accent }}
            >
              MENU DEKHO
            </span>
            <motion.span
              whileHover={{ rotate: 45 }}
              className="grid place-items-center w-11 h-11 rounded-full bg-cream text-espresso group-hover:bg-gold transition-colors"
            >
              <ArrowUpRight size={20} strokeWidth={2.4} />
            </motion.span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Categories() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const reduced = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (isMobile || reduced) return;
    const ctx = gsap.context(() => {
      const track = trackRef.current!;
      const amount = () => track.scrollWidth - window.innerWidth + 40;
      gsap.to(track, {
        x: () => -amount(),
        ease: "none",
        scrollTrigger: {
          trigger: viewportRef.current,
          start: "top top",
          end: () => `+=${amount() + 120}`,
          scrub: 1,
          pin: sectionRef.current,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    }, sectionRef);
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("load", refresh);
      ctx.revert();
    };
  }, [isMobile, reduced]);

  return (
    <div ref={sectionRef} className="relative bg-parchment overflow-hidden">
      {/* heading scrolls in */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-20 pb-10">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="flex items-center gap-3 text-[12px] font-bold tracking-[0.3em] text-saffron-deep uppercase"
        >
          <span className="w-10 h-[2px] bg-saffron-deep inline-block" />
          Dhaabe ke chaar kone
        </motion.p>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-4">
          <h2 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl text-espresso leading-[0.95]">
            Kya lenge{" "}
            <span className="italic text-saffron-deep">aap?</span>
          </h2>
          <p className="font-hand text-2xl text-espresso/60 -rotate-2 hidden sm:block">
            scroll karo — kona kona ghoomo →
          </p>
        </div>
      </div>

      {/* rail */}
      <div
        ref={viewportRef}
        className={`${
          isMobile || reduced ? "overflow-x-auto snap-x snap-mandatory pb-16" : "pb-20"
        }`}
      >
        <div
          ref={trackRef}
          className="flex gap-6 lg:gap-8 w-max pl-5 sm:pl-8 pr-[8vw] items-stretch"
        >
          {CATEGORIES.map((c, i) => (
            <div key={c.id} className={isMobile || reduced ? "snap-center" : ""}>
              <CategoryCard c={c} index={i} />
            </div>
          ))}
          {/* trailing CTA card */}
          <motion.button
            whileHover={{ y: -8 }}
            onClick={() => scrollToId("#menu")}
            className="shrink-0 w-[70vw] sm:w-[360px] h-[440px] lg:h-[480px] rounded-[1.8rem] bg-espresso text-cream flex flex-col items-start justify-between p-8 text-left shadow-card hover:shadow-lift transition-shadow snap-center"
            data-hover
          >
            <p className="font-hand text-2xl text-gold">bhookh lagi?</p>
            <div>
              <p className="font-display font-black text-4xl lg:text-5xl leading-tight">
                Puri daftar
                <br />
                <span className="italic text-saffron">ek jagah</span>
              </p>
              <span className="mt-6 inline-flex items-center gap-2 bg-saffron text-espresso-deep font-bold px-6 h-12 rounded-full hover:bg-gold transition-colors">
                Menu kholo <ArrowUpRight size={18} strokeWidth={2.4} />
              </span>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
