/* ── Kapila Dairy · flowing-milk WebGL backdrop (lazy-loaded) ─────── */
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 p = uv * 3.0;
  float t = uTime * 0.06;

  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, t * 1.1)));
  vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2)), fbm(p + 4.0 * q + vec2(8.3, 2.8)));
  float f = fbm(p + 3.2 * r);

  /* ripple that follows the cursor */
  vec2 suv = uv * vec2(1.7, 1.0);
  vec2 sm = uMouse * vec2(1.7, 1.0);
  float d = distance(suv, sm);
  f += sin(d * 34.0 - uTime * 3.0) * exp(-d * 4.2) * 0.10;

  vec3 creamDeep = vec3(0.998, 0.968, 0.886);
  vec3 creamMid  = vec3(0.996, 0.906, 0.741);
  vec3 warm      = vec3(1.000, 0.831, 0.616);
  vec3 saffron   = vec3(1.000, 0.714, 0.400);

  vec3 col = mix(creamDeep, creamMid, smoothstep(0.25, 0.75, f));
  col = mix(col, warm, smoothstep(0.5, 0.92, q.y) * 0.55);
  col = mix(col, saffron, smoothstep(0.62, 0.96, r.x) * 0.34);

  float vig = smoothstep(1.3, 0.35, distance(uv, vec2(0.5, 0.42)));
  col *= 0.88 + 0.12 * vig;

  gl_FragColor = vec4(col, 1.0);
}
`;

function MilkPlane() {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    }),
    []
  );

  useFrame((state, delta) => {
    const m = mat.current;
    if (!m) return;
    m.uniforms.uTime.value += delta;
    const t = m.uniforms.uMouse.value as THREE.Vector2;
    t.x += (state.pointer.x * 0.5 + 0.5 - t.x) * 0.045;
    t.y += (state.pointer.y * 0.5 + 0.5 - t.y) * 0.045;
  });

  return (
    <mesh position={[0, 0, -0.5]}>
      <planeGeometry args={[8, 8]} />
      <shaderMaterial ref={mat} vertexShader={VERT} fragmentShader={FRAG} uniforms={uniforms} />
    </mesh>
  );
}

function MilkDroplets() {
  const g1 = useRef<THREE.Mesh>(null);
  const g2 = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (g1.current) {
      g1.current.position.y = 0.7 + Math.sin(t * 0.9) * 0.2;
      g1.current.rotation.y = t * 0.22;
      g1.current.scale.setScalar(0.42 + Math.sin(t * 1.3) * 0.035);
    }
    if (g2.current) {
      g2.current.position.y = -0.55 + Math.sin(t * 0.7 + 2) * 0.24;
      g2.current.rotation.z = t * 0.18;
    }
  });
  return (
    <>
      <mesh ref={g1} position={[-2.1, 0.7, -1.6]} scale={0.42}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#fff2d6" roughness={0.3} />
      </mesh>
      <mesh ref={g2} position={[2.0, -0.55, -2.2]} scale={0.75}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#ffe4b2" roughness={0.35} />
      </mesh>
    </>
  );
}

export default function MilkCanvas() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 1], fov: 45 }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[2, 3, 4]} intensity={0.5} />
        <MilkPlane />
        <MilkDroplets />
      </Canvas>
    </div>
  );
}
