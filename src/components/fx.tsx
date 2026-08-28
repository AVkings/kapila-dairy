/* ── Kapila Dairy · shared FX: rolling counter + sugar particles ───── */
import { useEffect, useRef } from "react";
import { animate } from "animejs";

/* ── 3D rolling digit column (Anime.js) ── */
function Digit({ d, delay }: { d: number; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    animate(el, {
      translateY: ["0%", `${-d * 10}%`],
      duration: 1350,
      ease: "outExpo",
      delay,
    });
  }, [d, delay]);
  return (
    <span className="inline-block h-[1em] overflow-hidden align-middle">
      <span ref={ref} className="block">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className="block h-[1em] leading-[1em]">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Slot-machine rolling number. */
export function RollCounter({ value, className = "" }: { value: number; className?: string }) {
  const str = String(Math.max(0, Math.floor(value)));
  return (
    <span className={`inline-flex overflow-hidden leading-none ${className}`}>
      {str.split("").map((ch, i) => (
        <Digit key={`${str.length}-${i}`} d={Number(ch)} delay={i * 90} />
      ))}
    </span>
  );
}

/* ── floating sugar-grain particles (custom canvas, no deps) ── */
interface Grain {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  o: number;
  tw: number;
}

export function SugarParticles({
  density = 42,
  className = "",
}: {
  density?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let grains: Grain[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const spawn = (): Grain => ({
      x: Math.random(),
      y: 1 + Math.random() * 0.3,
      r: 1 + Math.random() * 2.4,
      vy: 0.0006 + Math.random() * 0.0016,
      vx: (Math.random() - 0.5) * 0.0005,
      o: 0.2 + Math.random() * 0.6,
      tw: Math.random() * Math.PI * 2,
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = window.innerWidth < 768 ? Math.round(density / 2) : density;
      grains = Array.from({ length: n }, () => {
        const g = spawn();
        g.y = Math.random();
        return g;
      });
    };

    const tick = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (const g of grains) {
        g.y -= g.vy;
        g.x += g.vx + Math.sin(g.tw) * 0.0002;
        g.tw += 0.03;
        if (g.y < -0.05) {
          Object.assign(g, spawn());
        }
        const twinkle = 0.6 + 0.4 * Math.sin(g.tw * 2);
        ctx.beginPath();
        ctx.arc(g.x * rect.width, g.y * rect.height, g.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 223, 130, ${g.o * twinkle})`;
        ctx.shadowColor = "rgba(255, 215, 0, 0.8)";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
      aria-hidden="true"
    />
  );
}
