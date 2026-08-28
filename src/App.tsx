/* ── Kapila Dairy · app shell: Lenis + GSAP + page transitions ─────── */
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { StoreProvider, useStore } from "./lib/store";
import Hero, { TickerStrip } from "./components/Hero";
import Categories from "./components/Categories";
import Products from "./components/Products";
import Rewards from "./components/Rewards";
import ProductDetail from "./components/ProductDetail";
import Checkout from "./components/Checkout";
import SuccessPage from "./components/Success";
import CartDrawer from "./components/CartDrawer";
import {
  Navbar,
  Footer,
  CustomCursor,
  Toasts,
  FlyLayer,
  LoginModal,
} from "./components/Chrome";

/* admin terminal is code-split — customers never download it */
const AdminApp = lazy(() => import("./admin/AdminApp"));

gsap.registerPlugin(ScrollTrigger);

/* ── admin route detection (works on any static host) ── */
function detectAdmin(): boolean {
  const p = window.location.pathname.replace(/\/+$/, "");
  const h = window.location.hash;
  return p === "/admin" || h === "#/admin" || h.startsWith("#/admin/");
}
function useIsAdminRoute(): boolean {
  const [admin, setAdmin] = useState(() => detectAdmin());
  useEffect(() => {
    /* typing …/admin normalizes to …/#/admin so refreshes keep working */
    if (window.location.pathname.replace(/\/+$/, "") === "/admin" && !window.location.hash.startsWith("#/admin")) {
      window.history.replaceState(null, "", window.location.pathname + "#/admin");
    }
    const onChange = () => setAdmin(detectAdmin());
    window.addEventListener("hashchange", onChange);
    setAdmin(detectAdmin());
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return admin;
}

function Shell() {
  const { view } = useStore();
  const lenisRef = useRef<Lenis | null>(null);

  /* Lenis smooth scroll synced with GSAP ScrollTrigger */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.25, smoothWheel: true });
    lenisRef.current = lenis;
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
      lenisRef.current = null;
    };
  }, []);

  /* reset scroll + refresh triggers on page change */
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 480);
    return () => window.clearTimeout(t);
  }, [view]);

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
          {view.page === "success" && <SuccessPage order={view.order} />}
        </motion.main>
      </AnimatePresence>

      <CartDrawer />
      <LoginModal />
      <Toasts />
      <FlyLayer />
    </div>
  );
}

export default function App() {
  const isAdmin = useIsAdminRoute();
  if (isAdmin)
    return (
      <Suspense
        fallback={
          <div className="min-h-screen grid place-items-center bg-[#14100c] text-[#ffc24b] led text-sm">
            counter khul raha…
          </div>
        }
      >
        <AdminApp />
      </Suspense>
    );
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
