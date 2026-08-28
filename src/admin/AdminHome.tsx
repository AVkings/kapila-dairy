/* ── Kapila Counter · dashboard (revenue · orders · dane) ─────────── */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { IndianRupee, ShoppingBag, Sparkles, Smartphone, Coins, RefreshCw, Database } from "lucide-react";
import {
  dailyStats, isMissingFunctionError, listOrders,
  type AdminDayStat, type AdminOrderRow,
} from "../lib/admin";
import type { AdminTab } from "./AdminApp";
import { inr } from "../lib/data";

function Stat({ label, value, sub, icon: Icon, accent, delay }: {
  label: string; value: string; sub: string; icon: typeof IndianRupee; accent: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative bg-coal-2/80 border border-cream/10 rounded-xl p-5 overflow-hidden group hover:border-cream/25 transition-colors"
    >
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-25 ${accent}`} />
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-bold tracking-[0.2em] text-cream/45 uppercase">{label}</p>
        <Icon size={17} className="text-cream/40 group-hover:text-cream/70 transition-colors" />
      </div>
      <p className="led text-[30px] font-bold text-cream mt-2 leading-none">{value}</p>
      <p className="text-[11.5px] font-semibold text-cream/40 mt-1.5">{sub}</p>
    </motion.div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  placed: "text-gold border-gold/60",
  ready: "text-led border-led/60",
  collected: "text-leaf border-leaf/60",
  cancelled: "text-chili border-chili/60",
};

export function AdminHome({ goto }: { goto: (t: AdminTab) => void }) {
  const [stats, setStats] = useState<AdminDayStat[] | null>(null);
  const [orders, setOrders] = useState<AdminOrderRow[] | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setErr("");
    const [s, o] = await Promise.all([dailyStats(7), listOrders(8)]);
    setStats(s.data); setOrders(o.data);
    if (s.error && o.error) setErr(s.error);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const weekRevenue = (stats ?? []).reduce((a, b) => a + Number(b.revenue || 0), 0);
  const weekOrders = (stats ?? []).reduce((a, b) => a + Number(b.order_count || 0), 0);
  const weekDane = (stats ?? []).reduce((a, b) => a + Number(b.dane_issued || 0), 0);
  const onlinePct = weekOrders
    ? Math.round(((stats ?? []).reduce((a, b) => a + Number(b.online_orders || 0), 0) / weekOrders) * 100)
    : 0;

  const chart = [...(stats ?? [])].reverse().map((s) => ({
    day: new Date(s.day).toLocaleDateString("en-IN", { weekday: "short" }),
    revenue: Number(s.revenue || 0),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-black text-3xl">Dhaabe ka <span className="text-led">hisaab</span></h1>
          <p className="text-[13px] font-semibold text-cream/45 mt-1">Pichhle 7 din ka jaayza.</p>
        </div>
        <button onClick={() => void load()} className="flex items-center gap-2 h-10 px-4 rounded-lg border border-cream/15 text-[13px] font-bold text-cream/70 hover:text-led hover:border-led transition-colors" data-hover>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {err && (
        <div className="bg-chili/12 border-[1.5px] border-chili/50 rounded-xl px-5 py-4 flex items-start gap-3">
          <Database size={20} className="text-chili shrink-0 mt-0.5" />
          <div className="text-[13px] font-semibold text-cream/85 leading-relaxed">
            <p className="text-chili font-bold">{err}</p>
            {isMissingFunctionError(err) && (
              <p className="mt-1.5">
                Database ke functions missing hain. Login screen pe{" "}
                <b className="text-led">"Poora SQL copy karo"</b> dabao, phir Supabase → SQL Editor mein
                paste karke <b>Run</b> karo, aur yahan Refresh dabao.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Stat label="7-din Revenue" value={inr(weekRevenue)} sub="total kamai" icon={IndianRupee} accent="bg-led" delay={0} />
        <Stat label="Orders" value={String(weekOrders)} sub={`${chart.length} din mein`} icon={ShoppingBag} accent="bg-saffron" delay={0.06} />
        <Stat label="Dane baante" value={String(weekDane)} sub="sakhar ke dane" icon={Sparkles} accent="bg-gold" delay={0.12} />
        <Stat label="Online share" value={`${onlinePct}%`} sub="Razorpay se aaya" icon={Smartphone} accent="bg-leaf" delay={0.18} />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
        {/* revenue chart */}
        <div className="bg-coal-2/80 border border-cream/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold tracking-[0.2em] text-cream/45 uppercase">Revenue · 7 din</p>
            <Coins size={16} className="text-led/70" />
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffc24b" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#ffc24b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,254,240,0.06)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "rgba(255,254,240,0.45)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,254,240,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1d1712", border: "1px solid rgba(255,194,75,0.3)", borderRadius: 10, color: "#fffef0" }}
                  labelStyle={{ color: "#ffc24b", fontWeight: 700 }}
                  formatter={(v: number) => [inr(v), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#ffc24b" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* recent orders */}
        <div className="bg-coal-2/80 border border-cream/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold tracking-[0.2em] text-cream/45 uppercase">Taaza orders</p>
            <button onClick={() => goto("scan")} className="text-[11.5px] font-bold text-led hover:text-gold transition-colors" data-hover>
              Scan karo →
            </button>
          </div>
          {orders === null ? (
            <p className="text-[13px] font-semibold text-cream/40 py-8 text-center">Orders load ho rahe…</p>
          ) : orders.length === 0 ? (
            <p className="text-[13px] font-semibold text-cream/40 py-8 text-center">Abhi koi order nahi — pehla order aane do!</p>
          ) : (
            <ul className="space-y-2.5">
              {orders.map((o) => (
                <li key={o.order_id} className="flex items-center gap-3 bg-coal-3/60 border border-cream/8 rounded-lg px-3.5 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold truncate">{o.customer_name} <span className="led text-[10.5px] text-cream/40">{o.order_id}</span></p>
                    <p className="text-[10.5px] font-semibold text-cream/40">{new Date(o.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {o.payment}{o.paid ? " · PAID" : ""}</p>
                  </div>
                  <span className="led text-[13px] font-bold text-led">{inr(o.total)}</span>
                  <span className={`text-[9.5px] font-bold tracking-wider uppercase border rounded-full px-2 py-0.5 ${STATUS_STYLE[o.status]}`}>{o.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
