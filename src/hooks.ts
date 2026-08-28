/* ── Kapila Dairy · animation & device hooks ───────────────────────── */
import { useEffect, useRef, useState } from "react";
import { useMotionValue, useSpring, type MotionValue } from "framer-motion";

export function useIsMobile(bp = 768): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < bp
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const fn = () => setMobile(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [bp]);
  return mobile;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

/** Magnetic pull — element chases the cursor with spring physics. */
export function useMagnetic<T extends HTMLElement>(strength = 0.35) {
  const ref = useRef<T | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 190, damping: 14, mass: 0.45 });
  const sy = useSpring(y, { stiffness: 190, damping: 14, mass: 0.45 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      x.set((e.clientX - (r.left + r.width / 2)) * strength);
      y.set((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => { x.set(0); y.set(0); };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, [strength, x, y]);

  return { ref, x: sx, y: sy } as { ref: React.MutableRefObject<T | null>; x: MotionValue<number>; y: MotionValue<number> };
}

export function useMouseParallax() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, [mx, my]);
  return { mx, my };
}
