/* ── Kapila Counter · dashboard (revenue · orders · dane) ──────────── */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { IndianRupee, ShoppingBag, Sparkles, Smartphone, Coins, RefreshCw } from "lucide-react";
import { dailyStats, listOrders, type AdminDayStat, type AdminOrderRow } from "../lib/admin";
import type { AdminTab } from "./AdminApp";
import { inr } from "../lib/data";

function Stat({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  delay,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof IndianRupee;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative bg-coal-2/80 border border-cream/10 rounded-xl p-5 overflow-hidden group hover:border-cream/25 transition-colors"
    >
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-25 ${accent}`} />
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-bold tracking-[0.2em] text-cream/45 uppercase">{label}</p>
        <Icon size={17} className="text-cream/40 group-hover:text-cream/70 transition-colors" />
      </div>
      <p className="led text-[32px] font-bold text-cream mt-2 leading-none">{value}</p>
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
    setLoading(true);
    setErr("");
    const [s, o] = await Promise.all([dailyStats(7), listOrders(8)]);
    setStats(s.data);
    setOrders(o.data);
    if (s.error && o.error) setErr(s.error);
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);

  const today = stats?.[0];
  const weekRevenue = (stats ?? []).reduce((a, b) => a + Number(b.revenue || 0), 0);
  const weekDane = (stats ?? []).reduce((a, b) => a + Number(b.dane_issued || 0), 0);
  const maxRev = Math.max(1, ...(stats ?? []).map((d) => Number(d.revenue || 0)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-black text-3xl">
            Aaj ka <span className="text-led">hisaab</span>
          </h1>
          <p className="text-[13px] font-semibold text-cream/45 mt-1">
            Dukaan ka poora haal — ek nazar mein.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 h-10 px-4 rounded-lg border border-cream/15 text-[13px] font-bold text-cream/70 hover:text-led hover:border-led transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {err && (
        <div className="bg-chili/10 border border-chili/40 text-chili rounded-xl px-4 py-3 text-[13px] font-bold">
          {err}
        </div>
      )}

      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Stat
          label="Aaj ki kamai"
          value={today ? inr(Number(today.revenue || 0)) : "—"}
          sub={`${today?.order_count ?? 0} order aaj`}
          icon={IndianRupee}
          accent="bg-saffron"
          delay={0}
        />
        <Stat
          label="7 din ka revenue"
          value={stats ? inr(weekRevenue) : "—"}
          sub="poore hafte ka jod"
          icon={Coins}
          accent="bg-gold"
          delay={0.06}
        />
        <Stat
          label="Aaj ke order"
          value={today ? String(today.order_count ?? 0) : "—"}
          sub={`${today?.paid_orders ?? 0} paid · ${today ? (today.order_count ?? 0) - (today.paid_orders ?? 0) : 0} baaki`}
          icon={ShoppingBag}
          accent="bg-led"
          delay={0.12}
        />
        <Stat
          label="Dane baante (7 din)"
          value={stats ? String(weekDane) : "—"}
          sub="sakhar ke dane"
          icon={Sparkles}
          accent="bg-leaf"
          delay={0.18}
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-5">
        {/* 7-day chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="bg-coal-2/80 border border-cream/10 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px] font-bold tracking-[0.2em] text-cream/45 uppercase">Pichhle 7 din</p>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-cream/40">
              <Smartphone size={13} /> revenue / din
            </span>
          </div>
          <div className="flex items-end gap-2.5 h-44">
            {(stats ?? []).slice().reverse().map((d, i) => {
              const h = Math.max(6, (Number(d.revenue || 0) / maxRev) * 100);
              const label = new Date(d.day).toLocaleDateString("en-IN", { weekday: "short" });
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="led text-[10px] text-cream/0 group-hover:text-led transition-colors">
                    {inr(Number(d.revenue || 0))}
                  </span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full rounded-t-md bg-gradient-to-t from-saffron/70 to-led group-hover:from-saffron group-hover:to-gold transition-colors"
                    title={`${label}: ${inr(Number(d.revenue || 0))}`}
                  />
                  <span className="led text-[10px] text-cream/40">{label}</span>
                </div>
              );
            })}
            {!stats && <p className="text-cream/30 text-sm w-full text-center">load ho raha…</p>}
          </div>
        </motion.div>

        {/* recent orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.45 }}
          className="bg-coal-2/80 border border-cream/10 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-bold tracking-[0.2em] text-cream/45 uppercase">Taaza order</p>
            <button
              onClick={() => goto("scan")}
              className="text-[12px] font-bold text-led hover:text-gold transition-colors"
            >
              Scan & Collect →
            </button>
          </div>
          <div className="space-y-2.5">
            {(orders ?? []).map((o) => (
              <div
                key={o.order_id}
                className="flex items-center gap-3 bg-coal-3/60 border border-cream/8 rounded-lg px-3.5 py-2.5 hover:border-cream/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="led text-[12.5px] text-cream font-bold truncate">
                    {o.order_id} <span className="text-cream/35">·</span>{" "}
                    <span className="font-sans font-semibold text-cream/80">{o.customer_name}</span>
                  </p>
                  <p className="text-[11px] font-semibold text-cream/40">
                    {o.items.length} item · {o.payment === "redeem" ? "DANE FREE" : o.payment}
                  </p>
                </div>
                <span className={`stamp text-[10px] ${o.paid ? "text-leaf border-leaf/70" : "text-gold border-gold/70"}`}>
                  {o.paid ? "PAID" : "DUE"}
                </span>
                <span className={`led text-[15px] font-bold ${o.paid ? "text-cream" : "text-gold"}`}>
                  {o.payment === "redeem" ? "FREE" : inr(Number(o.total))}
                </span>
              </div>
            ))}
            {orders && orders.length === 0 && (
              <p className="text-cream/30 text-sm text-center py-6">Abhi koi order nahi aaya.</p>
            )}
            {!orders && <p className="text-cream/30 text-sm text-center py-6">load ho raha…</p>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
