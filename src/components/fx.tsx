/* ── Kapila Dairy · MilkCanvas · RollCounter · SugarParticles ──────── */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Particles from "@tsparticles/react";
import initParticlesEngine from "@tsparticles/react";
import type { Engine, ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import { animate } from "animejs";
import { useIsMobile } from "../hooks";

/* ── milky liquid shader ── */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = vec2(uv.x * aspect, uv.y);

    vec2 m = vec2(uMouse.x * aspect, uMouse.y);
    float md = distance(p, m);
    float ripple = sin(md * 24.0 - uTime * 3.2) * exp(-md * 4.5) * 0.09;

    vec2 q = vec2(fbm(p * 1.6 + uTime * 0.05), fbm(p * 1.6 + 5.2 - uTime * 0.04));
    float f = fbm(p * 1.8 + q * 1.5 + ripple * 4.0 + uTime * 0.03);

    vec3 milk   = vec3(1.0, 0.992, 0.955);
    vec3 cream  = vec3(1.0, 0.945, 0.835);
    vec3 saff   = vec3(1.0, 0.76, 0.36);
    vec3 gold   = vec3(0.99, 0.85, 0.45);

    vec3 col = mix(milk, cream, smoothstep(0.25, 0.8, f));
    col = mix(col, saff, smoothstep(0.58, 0.95, fbm(p * 2.6 - q + uTime * 0.045)) * 0.42);
    col = mix(col, gold, smoothstep(0.72, 0.98, f * q.x * 2.0) * 0.25);

    col += ripple * vec3(1.0, 0.93, 0.8) * 2.2;
    col += pow(1.0 - abs(f - 0.5) * 2.0, 3.0) * 0.05;

    float vig = smoothstep(1.25, 0.35, distance(uv, vec2(0.5)) * 1.35);
    col *= mix(0.88, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function MilkPlane() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { viewport, size, pointer } = useThree();

  useEffect(() => {
    if (mat.current) mat.current.uniforms.uResolution.value.set(size.width, size.height);
  }, [size]);

  useFrame((state) => {
    if (!mat.current) return;
    const u = mat.current.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uMouse.value.x += (pointer.x * 0.5 + 0.5 - u.uMouse.value.x) * 0.045;
    u.uMouse.value.y += (pointer.y * 0.5 + 0.5 - u.uMouse.value.y) * 0.045;
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        }}
      />
    </mesh>
  );
}

/** Lazy-loadable flowing milk backdrop (desktop only). */
export default function MilkCanvas() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 1] }}
      style={{ position: "absolute", inset: 0 }}
    >
      <MilkPlane />
    </Canvas>
  );
}

/* ── slot-machine rolling digits (Anime.js) ── */
function Digit({ d, delay }: { d: number; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    animate(el, { translateY: ["0%", `${-d * 10}%`], duration: 1350, ease: "outExpo", delay });
  }, [d, delay]);
  return (
    <span className="inline-block h-[1em] overflow-hidden align-middle">
      <span ref={ref} className="block">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className="block h-[1em] leading-[1em]">{n}</span>
        ))}
      </span>
    </span>
  );
}

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

/* ── floating sugar-grain particles ── */
let enginePromise: Promise<void> | null = null;
function ensureEngine(): Promise<void> {
  if (!enginePromise) {
    enginePromise = initParticlesEngine((engine: Engine) => loadSlim(engine)).then(() => undefined);
  }
  return enginePromise;
}

export function SugarParticles({ id, className = "" }: { id: string; className?: string }) {
  const [ready, setReady] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    let alive = true;
    ensureEngine().then(() => { if (alive) setReady(true); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const options = useMemo<ISourceOptions>(() => ({
    fullScreen: { enable: false },
    background: { color: "transparent" },
    fpsLimit: 60,
    particles: {
      number: { value: isMobile ? 20 : 44, density: { enable: false } },
      color: { value: ["#FFF3D6", "#FFD700", "#FFFDF4"] },
      shape: { type: "circle" },
      opacity: { value: { min: 0.18, max: 0.85 }, animation: { enable: true, speed: 0.7, minimumValue: 0.12, sync: false } },
      size: { value: { min: 1, max: 3.2 } },
      move: { enable: true, direction: "top", speed: { min: 0.25, max: 0.9 }, straight: false, outModes: { default: "out" } },
    },
    detectRetina: true,
  }), [isMobile]);

  if (!ready) return null;
  return <Particles id={id} options={options} className={className} />;
}
