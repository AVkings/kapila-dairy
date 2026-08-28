/* ── Kapila Counter · admin terminal (login + shell + tabs) ───────── */
import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, ScanLine, Receipt, Users, Package, LogOut, Copy, Check, Store,
  Lock, Database, AlertTriangle,
} from "lucide-react";
import {
  attemptLogin, endAdminSession, isAdminSession, lockRemainingMs, MAX_ATTEMPTS,
} from "../lib/admin";
import FULL_SQL from "../../supabase/kapila_FULL.sql?raw";
import { AdminHome } from "./AdminHome";
import { AdminScan } from "./AdminScan";
import { AdminOrders, AdminCustomers, AdminProducts } from "./AdminPanels";

export type AdminTab = "dashboard" | "scan" | "orders" | "customers" | "products";

const TABS: { id: AdminTab; label: string; icon: typeof LayoutDashboard; hint: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "revenue & stats" },
  { id: "scan", label: "Scan & Collect", icon: ScanLine, hint: "ticket + payment" },
  { id: "orders", label: "New Order", icon: Receipt, hint: "counter se banao" },
  { id: "customers", label: "Dane Khata", icon: Users, hint: "balance & inaam" },
  { id: "products", label: "Inventory", icon: Package, hint: "mithai ki tijori" },
];

function LoginGate({ onIn }: { onIn: () => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [lockedMs, setLockedMs] = useState(() => lockRemainingMs());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const iv = window.setInterval(() => setLockedMs(lockRemainingMs()), 1000);
    return () => window.clearInterval(iv);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const res = attemptLogin(user, pass);
    if (res.ok) { onIn(); return; }
    if (res.lockedMs) { setLockedMs(res.lockedMs); setErr(""); return; }
    setErr(`Galat user ya password. ${res.attemptsLeft ?? 0} koshish bachi hai.`);
  };

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(FULL_SQL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch { setErr("Copy nahi hua — supabase/kapila_FULL.sql manually kholo."); }
  };

  const mm = Math.floor(lockedMs / 60000);
  const ss = Math.floor((lockedMs % 60000) / 1000);

  return (
    <div className="admin-shell min-h-screen grid place-items-center px-4 relative overflow-hidden">
      <div className="scanlines absolute inset-0" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md bg-coal-2 border border-cream/12 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="bg-espresso-deep px-7 py-6 flex items-center gap-4">
          <span className="grid place-items-center w-12 h-12 rounded-xl bg-led/15 border border-led/40">
            <Lock size={22} className="text-led" />
          </span>
          <div>
            <p className="font-display font-black text-2xl text-cream leading-none">Kapila Counter</p>
            <p className="led text-[10px] tracking-[0.3em] text-led/80 uppercase mt-1.5">staff terminal</p>
          </div>
        </div>

        <div className="p-7">
          {lockedMs > 0 ? (
            <div className="text-center py-6">
              <AlertTriangle size={36} className="mx-auto text-chili" />
              <p className="font-display font-black text-2xl text-cream mt-3">Terminal band hai</p>
              <p className="text-[13px] font-semibold text-cream/55 mt-1.5">
                {MAX_ATTEMPTS} galat koshish — {MAX_ATTEMPTS === 3 ? "15" : ""} minute ka lock.
              </p>
              <p className="led text-4xl text-chili mt-4">{mm}:{String(ss).padStart(2, "0")}</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label className="block text-[10.5px] font-bold tracking-[0.2em] text-cream/45 uppercase mb-1.5">User</label>
              <input
                value={user} onChange={(e) => setUser(e.target.value)} placeholder="admin@kapila"
                className="led w-full h-12 px-4 rounded-lg bg-coal-3 border border-cream/12 text-cream placeholder:text-cream/25 focus:border-led text-[14px] mb-4"
              />
              <label className="block text-[10.5px] font-bold tracking-[0.2em] text-cream/45 uppercase mb-1.5">Password</label>
              <input
                type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••••••"
                className="led w-full h-12 px-4 rounded-lg bg-coal-3 border border-cream/12 text-cream placeholder:text-cream/25 focus:border-led text-[14px]"
              />
              {err && <p className="text-chili text-[12.5px] font-bold mt-3">{err}</p>}
              <motion.button whileTap={{ scale: 0.97 }} type="submit" className="mt-5 w-full h-12 rounded-lg bg-led text-coal font-bold text-[14px] hover:bg-gold transition-colors">
                Counter kholo
              </motion.button>
            </form>
          )}

          <button
            onClick={() => void copySql()}
            className={`mt-4 w-full h-11 rounded-lg border text-[12.5px] font-bold flex items-center justify-center gap-2 transition-colors ${
              copied ? "border-leaf text-leaf bg-leaf/10" : "border-cream/20 text-cream/60 hover:text-led hover:border-led/60"
            }`}
          >
            {copied ? (<><Check size={15} /> Poora SQL copy ho gaya!</>) : (<><Database size={15} /> Poora SQL copy karo (Supabase ke liye)</>)}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(() => isAdminSession());
  const [tab, setTab] = useState<AdminTab>("dashboard");

  if (!authed) return <LoginGate onIn={() => setAuthed(true)} />;

  const logout = () => { endAdminSession(); setAuthed(false); };

  return (
    <div className="admin-shell min-h-screen text-cream relative">
      <div className="scanlines fixed inset-0 pointer-events-none" aria-hidden="true" />

      {/* top bar */}
      <header className="sticky top-0 z-40 bg-coal/90 backdrop-blur-md border-b border-cream/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-led/15 border border-led/40">
              <Store size={17} className="text-led" />
            </span>
            <div>
              <p className="font-display font-black text-lg leading-none">Kapila Counter</p>
              <p className="led text-[9px] tracking-[0.28em] text-led/70 uppercase mt-0.5">staff terminal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`${window.location.pathname}#`}
              className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-lg border border-cream/20 text-[12.5px] font-bold text-cream/70 hover:text-gold hover:border-gold/60 transition-colors"
              data-hover
            >
              <Store size={15} /> Dukaan dekho
            </a>
            <button onClick={logout} className="flex items-center gap-2 h-10 px-4 rounded-lg border border-chili/40 text-[12.5px] font-bold text-chili hover:bg-chili/10 transition-colors" data-hover>
              <LogOut size={15} /> Band karo
            </button>
          </div>
        </div>
      </header>

      {/* tabs */}
      <nav className="sticky top-16 z-30 bg-coal/80 backdrop-blur-md border-b border-cream/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2.5 px-4 sm:px-5 h-14 text-[13.5px] font-bold whitespace-nowrap transition-colors ${
                  active ? "text-led" : "text-cream/50 hover:text-cream/85"
                }`}
                data-hover
              >
                <t.icon size={17} />
                <span>
                  {t.label}
                  <span className={`block text-[9px] font-semibold tracking-wider uppercase ${active ? "text-led/60" : "text-cream/30"}`}>{t.hint}</span>
                </span>
                {active && <motion.span layoutId="admin-tab" className="absolute bottom-0 left-3 right-3 h-[3px] rounded-t-full bg-led" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === "dashboard" && <AdminHome goto={setTab} />}
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
