/* ── Kapila Counter · admin shell + terminal login ─────────────────── */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  ScanLine,
  Receipt,
  Users,
  Package,
  LogOut,
  Lock,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import {
  attemptLogin,
  endAdminSession,
  isAdminSession,
  lockRemainingMs,
  MAX_ATTEMPTS,
} from "../lib/admin";
import { AdminHome } from "./AdminHome";
import { AdminScan } from "./AdminScan";
import { AdminOrders } from "./AdminOrders";
import { AdminCustomers } from "./AdminCustomers";
import { AdminProducts } from "./AdminProducts";

export type AdminTab = "home" | "scan" | "orders" | "customers" | "products";

const TABS: { id: AdminTab; label: string; icon: typeof LayoutDashboard; hint: string }[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard, hint: "aaj ka hisaab" },
  { id: "scan", label: "Scan & Collect", icon: ScanLine, hint: "ticket → payment" },
  { id: "orders", label: "New Order", icon: Receipt, hint: "counter se banao" },
  { id: "customers", label: "Dane Khata", icon: Users, hint: "balance · redeem" },
  { id: "products", label: "Inventory", icon: Package, hint: "mithai · price" },
];

function DiyaMark({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <path d="M24 4C24 4 9 21.5 9 30.5a15 15 0 0 0 30 0C39 21.5 24 4 24 4Z" fill="#FF9933" />
      <path d="M24 15c0 0-8.5 10-8.5 16a8.5 8.5 0 0 0 17 0C32.5 25 24 15 24 15Z" fill="#14100c" />
      <circle cx="24" cy="32" r="3.4" fill="#FFC24B" />
    </svg>
  );
}

/* ── login terminal ── */
function Login({ onSuccess }: { onSuccess: () => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockMs, setLockMs] = useState<number>(() => lockRemainingMs());
  const [shake, setShake] = useState(0);

  /* tick down the lockout clock */
  useEffect(() => {
    if (lockMs <= 0) return;
    const t = window.setInterval(() => {
      const r = lockRemainingMs();
      setLockMs(r);
      if (r <= 0) setErr("");
    }, 1000);
    return () => window.clearInterval(t);
  }, [lockMs]);

  const locked = lockMs > 0;
  const lockMin = Math.ceil(lockMs / 60000);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (locked) return;
    const res = attemptLogin(user, pass);
    if (res.ok) {
      onSuccess();
      return;
    }
    setShake((s) => s + 1);
    if (res.lockedMs) {
      setLockMs(res.lockedMs);
      setAttemptsLeft(null);
      setErr("");
    } else {
      setAttemptsLeft(res.attemptsLeft ?? 0);
      setErr("Username ya password galat hai.");
    }
  };

  const inputCls =
    "led w-full h-12 px-4 rounded-lg bg-coal-3 border border-cream/12 text-cream placeholder:text-cream/25 focus:border-led focus:shadow-[0_0_0_3px_rgba(255,194,75,0.15)] transition-all text-[15px]";

  return (
    <div className="admin-shell scanlines relative min-h-screen grid place-items-center px-4 text-cream overflow-hidden">
      <div className="noise-layer" aria-hidden="true" />
      {/* ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full bg-saffron/10 blur-[120px]" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="text-center mb-7">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            className="mx-auto w-16 h-16 grid place-items-center rounded-2xl bg-coal-2 border border-cream/12 shadow-lift"
          >
            <DiyaMark className="w-10 h-10" />
          </motion.div>
          <h1 className="font-display font-black text-3xl mt-4 leading-none">
            Kapila <span className="text-led">Counter</span>
          </h1>
          <p className="led text-[11px] tracking-[0.3em] text-cream/40 uppercase mt-2">
            staff terminal · restricted
          </p>
        </div>

        <motion.form
          key={shake}
          onSubmit={submit}
          animate={shake ? { x: [0, -9, 9, -6, 6, 0] } : undefined}
          transition={{ duration: 0.4 }}
          className="bg-coal-2/90 backdrop-blur border border-cream/12 rounded-2xl p-6 shadow-lift relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-saffron via-gold to-saffron" />

          {locked ? (
            <div className="text-center py-6">
              <ShieldAlert size={34} className="mx-auto text-chili" />
              <p className="font-display font-bold text-xl mt-3">Terminal locked</p>
              <p className="led text-4xl text-chili mt-3">{lockMin}:00</p>
              <p className="text-[12.5px] font-semibold text-cream/50 mt-2 leading-relaxed">
                {MAX_ATTEMPTS} galat koshish ke baad {`15 min`} ka break.<br />
                Chai pee lo, phir try karna.
              </p>
            </div>
          ) : (
            <>
              <label className="block text-[10.5px] font-bold tracking-[0.22em] text-cream/45 mb-1.5 uppercase">
                Username
              </label>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="admin@kapila"
                autoComplete="username"
                className={inputCls + " mb-4"}
              />
              <label className="block text-[10.5px] font-bold tracking-[0.22em] text-cream/45 mb-1.5 uppercase">
                Password
              </label>
              <input
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••••"
                type="password"
                autoComplete="current-password"
                className={inputCls}
              />

              {err && (
                <p className="flex items-center gap-1.5 text-chili text-[12.5px] font-bold mt-3">
                  <Lock size={13} /> {err}
                  {attemptsLeft != null && (
                    <span className="text-cream/50 font-semibold">
                      · {attemptsLeft} try bach{attemptsLeft === 1 ? "a" : "e"}
                    </span>
                  )}
                </p>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="mt-5 w-full h-12 rounded-lg bg-led text-coal font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-gold transition-colors shadow-[0_8px_26px_-8px_rgba(255,194,75,0.5)]"
              >
                <Lock size={16} /> Counter kholo
              </motion.button>
              <p className="led text-[10.5px] text-cream/35 text-center mt-3.5">
                {MAX_ATTEMPTS} galat attempts = 15 min lock
              </p>
            </>
          )}
        </motion.form>

        <a
          href="#/"
          onClick={() => (window.location.hash = "#/")}
          className="flex items-center justify-center gap-1.5 mt-5 text-[12.5px] font-semibold text-cream/45 hover:text-led transition-colors"
        >
          <ExternalLink size={13} /> Wapas dukaan pe
        </a>
      </motion.div>
    </div>
  );
}

/* ── shell ── */
export default function AdminApp() {
  const [authed, setAuthed] = useState<boolean>(() => isAdminSession());
  const [tab, setTab] = useState<AdminTab>("home");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const clock = useMemo(
    () =>
      now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    [now]
  );
  const day = useMemo(
    () => now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
    [now]
  );

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  return (
    <div className="admin-shell scanlines relative min-h-screen text-cream">
      <div className="noise-layer" aria-hidden="true" />

      {/* top bar */}
      <header className="sticky top-0 z-40 bg-coal/85 backdrop-blur-xl border-b border-cream/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <DiyaMark className="w-9 h-9" />
            <div className="leading-none">
              <p className="font-display font-black text-lg">
                Kapila <span className="text-led">Counter</span>
              </p>
              <p className="led text-[9.5px] tracking-[0.28em] text-cream/40 uppercase mt-0.5">
                admin terminal
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 led text-[13px] text-cream/60">
            <span className="px-3 py-1.5 rounded-md bg-coal-2 border border-cream/10">{day}</span>
            <span className="px-3 py-1.5 rounded-md bg-coal-2 border border-cream/10 text-led">{clock}</span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-leaf/15 border border-leaf/40 text-leaf text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-leaf animate-pulse" /> ONLINE
            </span>
          </div>

          <button
            onClick={() => {
              endAdminSession();
              setAuthed(false);
            }}
            className="flex items-center gap-2 h-10 px-4 rounded-lg border border-cream/15 text-[13px] font-bold text-cream/70 hover:border-chili hover:text-chili transition-colors"
          >
            <LogOut size={15} /> Band karo
          </button>
        </div>

        {/* tabs */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto pb-2 -mt-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative shrink-0 flex items-center gap-2 px-4 h-10 rounded-lg text-[13px] font-bold transition-colors ${
                  active ? "text-coal" : "text-cream/60 hover:text-cream hover:bg-coal-2"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="admin-tab"
                    className="absolute inset-0 rounded-lg bg-led shadow-[0_6px_20px_-6px_rgba(255,194,75,0.5)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={15} />
                  {t.label}
                  <span className={`hidden lg:inline text-[10px] font-semibold ${active ? "text-coal/60" : "text-cream/30"}`}>
                    · {t.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === "home" && <AdminHome goto={setTab} />}
            {tab === "scan" && <AdminScan />}
            {tab === "orders" && <AdminOrders />}
            {tab === "customers" && <AdminCustomers />}
            {tab === "products" && <AdminProducts />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
