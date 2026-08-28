/* ── Kapila Dairy · shared bits: slot-machine counter + sugar grains ── */
import { useEffect, useMemo, useRef, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import type { Engine, ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import { animate } from "animejs";
import { useIsMobile } from "../hooks";

/* 3D rolling digit column */
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

/** Slot-machine style rolling number (Anime.js). */
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

/* floating sugar-grain particles (tsparticles) */
let enginePromise: Promise<void> | null = null;
function ensureEngine(): Promise<void> {
  if (!enginePromise) {
    enginePromise = initParticlesEngine((engine: Engine) =>
      loadSlim(engine as never).then(() => undefined)
    );
  }
  return enginePromise;
}

export function SugarParticles({ id, className = "" }: { id: string; className?: string }) {
  const [ready, setReady] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    let alive = true;
    ensureEngine()
      .then(() => {
        if (alive) setReady(true);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const options = useMemo<ISourceOptions>(
    () => ({
      fullScreen: { enable: false },
      background: { color: "transparent" },
      fpsLimit: 60,
      particles: {
        number: { value: isMobile ? 20 : 44, density: { enable: false } },
        color: { value: ["#FFF3D6", "#FFD700", "#FFFDF4"] },
        shape: { type: "circle" },
        opacity: {
          value: { min: 0.18, max: 0.85 },
          animation: { enable: true, speed: 0.7, minimumValue: 0.12, sync: false },
        },
        size: { value: { min: 1, max: 3.2 } },
        move: {
          enable: true,
          direction: "top",
          speed: { min: 0.25, max: 0.9 },
          straight: false,
          outModes: { default: "out" },
        },
      },
      detectRetina: true,
    }),
    [isMobile]
  );

  if (!ready) return null;
  return <Particles id={id} options={options} className={className} />;
}
