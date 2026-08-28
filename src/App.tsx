/* ── Kapila Dairy · app shell: routing + Lenis + transitions ──────── */
import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { StoreProvider, useStore } from "./lib/store";
import Hero, { TickerStrip } from "./components/Hero";
import { Categories, Products, ProductDetail } from "./components/Catalog";
import Rewards from "./components/Rewards";
import { CartDrawer, Checkout, Success, PayPage } from "./components/Commerce";
import { Navbar, Footer, CustomCursor, Toasts, FlyLayer, LoginModal } from "./components/Chrome";

gsap.registerPlugin(ScrollTrigger);

const AdminApp = lazy(() => import("./admin/AdminApp"));

/* If a lazy chunk fails to load (network/host hiccup), show retry — never a blank page. */
class ChunkBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="min-h-screen grid place-items-center bg-[#14100c] text-[#ffc24b] font-mono text-sm p-6">
          <div className="text-center">
            <p className="text-xl mb-2">Counter load nahi hua</p>
            <p className="text-[#ffc24b]/60 mb-4 text-xs">Chunk fetch fail ho gaya. Dobara try karo.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-[#ffc24b]/50 rounded hover:bg-[#ffc24b]/10 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── route detection (works on any static host) ── */
function getHashRoute(): { admin: boolean; pay: string | null } {
  const h = window.location.hash;
  const p = window.location.pathname.replace(/\/+$/, "");
  const payMatch = h.match(/^#\/pay\/([A-Za-z0-9-]+)/);
  return {
    admin: p === "/admin" || h === "#/admin" || h.startsWith("#/admin/"),
    pay: payMatch ? payMatch[1] : null,
  };
}

function useRoute() {
  const [route, setRoute] = useState(getHashRoute);
  useEffect(() => {
    if (window.location.pathname.replace(/\/+$/, "") === "/admin" && !window.location.hash.startsWith("#/admin")) {
      window.history.replaceState(null, "", window.location.pathname + "#/admin");
    }
    const onChange = () => setRoute(getHashRoute());
    window.addEventListener("hashchange", onChange);
    setRoute(getHashRoute());
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

function Shop() {
  const { view } = useStore();
  const lenisRef = useRefLenis();

  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 480);
    return () => window.clearTimeout(t);
  }, [view, lenisRef]);

  const pageKey = view.page === "product" ? `product-${view.id}` : view.page;

  return (
    <div className="relative min-h-screen">
      <div className="noise-layer" aria-hidden="true" />
      <CustomCursor />
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.main
          key={pageKey}
          initial={{ opacity: 0, x: 26 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -26 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          className="overflow-x-clip"
        >
          {view.page === "home" && (
            <>
              <Hero />
              <TickerStrip />
              <Categories />
              <Products />
              <Rewards />
              <Footer />
            </>
          )}
          {view.page === "product" && <ProductDetail id={view.id} />}
          {view.page === "checkout" && <Checkout />}
          {view.page === "success" && <Success order={view.order} />}
        </motion.main>
      </AnimatePresence>
      <CartDrawer />
      <LoginModal />
      <Toasts />
      <FlyLayer />
    </div>
  );
}

/* Lenis smooth scroll synced with GSAP ScrollTrigger */
function useRefLenis() {
  const ref = useRef<Lenis | null>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.25, smoothWheel: true });
    ref.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    const onScroll = (e: Event) => {
      const target = (e as CustomEvent<string>).detail;
      if (target === "#top") lenis.scrollTo(0, { duration: 1.1 });
      else lenis.scrollTo(target, { offset: -64, duration: 1.3 });
    };
    window.addEventListener("kapila:scroll", onScroll);
    return () => {
      window.removeEventListener("kapila:scroll", onScroll);
      gsap.ticker.remove(raf);
      lenis.destroy();
      ref.current = null;
    };
  }, []);
  return ref;
}

export default function App() {
  const route = useRoute();

  if (route.pay) {
    return (
      <Suspense fallback={<div className="min-h-screen grid place-items-center bg-cream font-hand text-2xl text-saffron-deep">ek pal…</div>}>
        <PayPage orderId={route.pay} />
      </Suspense>
    );
  }

  if (route.admin) {
    return (
      <ChunkBoundary>
        <Suspense fallback={<div className="min-h-screen grid place-items-center bg-[#14100c] text-[#ffc24b] font-mono text-sm">counter khul raha…</div>}>
          <AdminApp />
        </Suspense>
      </ChunkBoundary>
    );
  }

  return (
    <StoreProvider>
      <Shop />
    </StoreProvider>
  );
}
