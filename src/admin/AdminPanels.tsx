/* ── Kapila Counter · orders + dane khata + inventory ─────────────── */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2, Gift, Minus, Plus, Search, Sparkles, Pencil, RefreshCw, UserPlus,
  ShoppingBag, Trash2, Package,
} from "lucide-react";
import {
  createCounterOrder, createCustomer, creditDane, findCustomer, listAllProducts,
  spendDane, toggleProduct, upsertProduct, type AdminCustomer, type ProductUpsert,
} from "../lib/admin";
import {
  grainsFrom, inr, makeOrderId, REWARD_TIERS,
  type Category, type Product, type UnitOption,
} from "../lib/data";

const inputCls =
  "w-full h-11 px-4 rounded-lg bg-coal-3 border border-cream/12 text-cream placeholder:text-cream/25 focus:border-led text-[14px] font-medium";
const labelCls = "block text-[10.5px] font-bold tracking-[0.2em] text-cream/45 uppercase mb-1.5";

function ErrBox({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div className="bg-chili/10 border border-chili/40 text-chili rounded-xl px-4 py-3 text-[13px] font-bold">{msg}</div>;
}
function OkBox({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div className="bg-leaf/10 border border-leaf/40 text-leaf rounded-xl px-4 py-3 text-[13px] font-bold flex items-center gap-2"><CheckCircle2 size={16} /> {msg}</div>;
}

/* ───────────────────────── NEW ORDER ───────────────────────── */
export function AdminOrders() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<{ id: string; unit: number; qty: number }[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paid, setPaid] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { void listAllProducts().then((r) => setProducts(r.data ?? [])); }, []);

  const addLine = () => {
    const first = products[0];
    if (first) setLines((l) => [...l, { id: first.id, unit: 0, qty: 1 }]);
  };
  const setLine = (i: number, patch: Partial<{ id: string; unit: number; qty: number }>) =>
    setLines((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const productOf = (id: string) => products.find((p) => p.id === id);
  const lineTotal = (ln: { id: string; unit: number; qty: number }) => {
    const p = productOf(ln.id);
    if (!p) return 0;
    return (p.units[ln.unit]?.price ?? 0) * ln.qty;
  };
  const total = lines.reduce((s, ln) => s + lineTotal(ln), 0);
  const grains = grainsFrom(total);

  const place = async () => {
    if (name.trim().length < 2) return setErr("Customer ka naam likho.");
    if (!/^\d{10}$/.test(phone)) return setErr("Phone 10 digit ka daalo.");
    if (lines.length === 0) return setErr("Kam se kam ek item jodo.");
    setErr(""); setBusy(true);
    const items = lines.map((ln) => {
      const p = productOf(ln.id)!;
      const u = p.units[ln.unit];
      return { id: p.id, name: p.name, pack: u.label, qty: ln.qty, price: u.price };
    });
    const res = await createCounterOrder({
      orderId: makeOrderId(), name: name.trim(), phone, pickup: "Counter se",
      payment: "counter", paid, total, grains, items,
    });
    setBusy(false);
    if (res.error) return setErr("Order nahi bana: " + res.error);
    setMsg(`Order ban gaya (${inr(total)}) — ${paid ? "PAID" : "payment baaki"} · ${grains} dane ${name.split(" ")[0]} ke khate mein.`);
    setLines([]); setName(""); setPhone("");
    window.setTimeout(() => setMsg(""), 4000);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display font-black text-3xl">Naya <span className="text-led">order</span></h1>
        <p className="text-[13px] font-semibold text-cream/45 mt-1">Jo customer website use nahi karte — unka order yahin se banao.</p>
      </div>
      <ErrBox msg={err} /><OkBox msg={msg} />

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5 items-start">
        <div className="bg-coal-2/80 border border-cream/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className={labelCls + " mb-0"}>Items</p>
            <button onClick={addLine} className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-led text-coal text-[12.5px] font-bold hover:bg-gold" data-hover>
              <Plus size={14} /> Item jodo
            </button>
          </div>
          {lines.length === 0 && <p className="text-[13px] font-semibold text-cream/35 py-6 text-center">"Item jodo" dabao — mithai chuno.</p>}
          {lines.map((ln, i) => {
            const p = productOf(ln.id);
            return (
              <div key={i} className="flex flex-wrap items-center gap-2 bg-coal-3/60 border border-cream/8 rounded-lg p-2.5">
                <select value={ln.id} onChange={(e) => setLine(i, { id: e.target.value, unit: 0 })} className={`${inputCls} flex-1 min-w-[150px] h-10`}>
                  {products.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                </select>
                <select value={ln.unit} onChange={(e) => setLine(i, { unit: Number(e.target.value) })} className={`${inputCls} w-[120px] h-10`}>
                  {(p?.units ?? []).map((u, ui) => <option key={u.label} value={ui}>{u.label} · {inr(u.price)}</option>)}
                </select>
                <div className="flex items-center gap-1 bg-coal-3 border border-cream/12 rounded-lg p-0.5">
                  <button onClick={() => setLine(i, { qty: Math.max(1, ln.qty - 1) })} className="w-8 h-8 grid place-items-center rounded-md hover:bg-coal-2" data-hover><Minus size={13} /></button>
                  <span className="led w-7 text-center text-[14px] font-bold">{ln.qty}</span>
                  <button onClick={() => setLine(i, { qty: ln.qty + 1 })} className="w-8 h-8 grid place-items-center rounded-md hover:bg-coal-2" data-hover><Plus size={13} /></button>
                </div>
                <span className="led text-[14px] font-bold text-led w-[80px] text-right">{inr(lineTotal(ln))}</span>
                <button onClick={() => setLines((l) => l.filter((_, j) => j !== i))} className="w-8 h-8 grid place-items-center rounded-md text-cream/40 hover:text-chili" data-hover><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>

        <div className="bg-coal-2/80 border border-cream/10 rounded-xl p-5 space-y-4">
          <div>
            <label className={labelCls}>Customer ka naam</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Suresh ji" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone (khata isi se judta hai)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="98765 43210" inputMode="numeric" className={inputCls + " tracking-widest"} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="w-5 h-5 accent-[#2F7D3B]" />
            <span className="text-[13.5px] font-bold text-cream/80">Paisa mil gaya (cash/UPI) — PAID mark karo</span>
          </label>
          <div className="border-t border-cream/10 pt-4 space-y-2">
            <div className="flex justify-between text-[13px] font-semibold text-cream/60"><span>Kul jod</span><span className="led text-led text-[16px] font-bold">{inr(total)}</span></div>
            <div className="flex justify-between text-[13px] font-semibold text-cream/60"><span>Sakhar ke dane</span><span className="led text-gold font-bold">+{grains}</span></div>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => void place()} disabled={busy} className="w-full h-12 rounded-lg bg-led text-coal font-bold text-[14px] hover:bg-gold transition-colors disabled:opacity-60 flex items-center justify-center gap-2" data-hover>
            <ShoppingBag size={16} /> {busy ? "Ban raha…" : "Order pakka karo"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── DANE KHATA ───────────────────────── */
export function AdminCustomers() {
  const [phone, setPhone] = useState("");
  const [cust, setCust] = useState<AdminCustomer | null>(null);
  const [found, setFound] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [creditAmt, setCreditAmt] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDane, setNewDane] = useState("0");

  const lookup = async () => {
    if (!/^\d{10}$/.test(phone)) return setErr("Phone 10 digit ka daalo.");
    setErr(""); setMsg(""); setBusy(true);
    const res = await findCustomer(phone);
    setBusy(false);
    if (res.error) return setErr("Khata nahi mila: " + res.error);
    if (!res.data || res.data.length === 0) { setCust(null); setFound(true); setNewName(""); setNewDane("0"); return; }
    setCust(res.data[0]); setFound(true);
  };

  const redeem = async (amount: number, what: string) => {
    if (!cust) return;
    setMsg(""); setErr(""); setBusy(true);
    const res = await spendDane(cust.phone, amount);
    setBusy(false);
    if (res.error) return setErr(`${what} nahi hua: ${res.error}`);
    setCust({ ...cust, dane: res.data ?? cust.dane - amount });
    setMsg(`${what} de diya! ${amount} dane kaate, ab ${res.data ?? cust.dane - amount} bache.`);
  };

  const credit = async () => {
    if (!cust) return;
    const amt = Number(creditAmt);
    if (!amt || amt <= 0) return setErr("Kitne dane dene hain — number daalo.");
    setMsg(""); setErr(""); setBusy(true);
    const res = await creditDane(cust.phone, amt);
    setBusy(false);
    if (res.error) return setErr("Dane nahi jude: " + res.error);
    setCust({ ...cust, dane: res.data ?? cust.dane + amt });
    setMsg(`+${amt} dane ${cust.name.split(" ")[0]} ke khate mein jud gaye.`);
    setCreditAmt("");
  };

  const create = async () => {
    if (newName.trim().length < 2) return setErr("Naye customer ka naam likho.");
    setErr(""); setBusy(true);
    const res = await createCustomer(newName.trim(), phone, Number(newDane) || 0);
    setBusy(false);
    if (res.error) return setErr("Khata nahi khula: " + res.error);
    const c = res.data?.[0];
    if (c) { setCust(c); setFound(true); setCreating(false); setMsg(`Naya khata khul gaya — ${c.name} (${c.dane} dane).`); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display font-black text-3xl">Dane <span className="text-led">khata</span></h1>
        <p className="text-[13px] font-semibold text-cream/45 mt-1">Customer ka phone daalo — balance dekho, inaam do, khata kholo.</p>
      </div>
      <ErrBox msg={err} /><OkBox msg={msg} />

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-5 items-start">
        <div className="space-y-4">
          <div className="bg-coal-2/80 border border-cream/10 rounded-xl p-5">
            <div className="flex gap-2">
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} onKeyDown={(e) => e.key === "Enter" && void lookup()} placeholder="98765 43210" inputMode="numeric" className={`led flex-1 h-12 px-4 rounded-lg bg-coal-3 border border-cream/12 text-cream placeholder:text-cream/25 focus:border-led text-[15px] tracking-widest`} />
              <button onClick={() => void lookup()} disabled={busy} className="flex items-center gap-2 h-12 px-5 rounded-lg bg-led text-coal text-[13.5px] font-bold hover:bg-gold disabled:opacity-50" data-hover>
                <Search size={16} /> {busy ? "…" : "Dekho"}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!found ? (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-coal-2/50 border border-dashed border-cream/15 rounded-xl min-h-[200px] grid place-items-center">
                <div className="text-center px-6">
                  <Sparkles size={26} className="mx-auto text-led/50" />
                  <p className="font-hand text-2xl text-cream/40 mt-2">khata yahan khulega…</p>
                </div>
              </motion.div>
            ) : !cust ? (
              <motion.div key="none" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-coal-2/80 border border-chili/30 rounded-xl p-5">
                <p className="font-display font-bold text-lg text-chili">Is number pe khata nahi hai</p>
                <p className="text-[13px] font-semibold text-cream/50 mt-1.5">Naya khata kholo — naam aur (chaaho toh) shuruaati dane do.</p>
                {!creating ? (
                  <button onClick={() => setCreating(true)} className="mt-3 flex items-center gap-2 h-11 px-4 rounded-lg bg-led text-coal text-[13px] font-bold hover:bg-gold" data-hover>
                    <UserPlus size={15} /> Naya khata kholo
                  </button>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className={labelCls}>Naam</label>
                      <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Customer ka naam" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Shuruaati dane (optional)</label>
                      <input value={newDane} onChange={(e) => setNewDane(e.target.value.replace(/\D/g, ""))} placeholder="0" inputMode="numeric" className={inputCls} />
                    </div>
                    <button onClick={() => void create()} disabled={busy} className="flex items-center gap-2 h-11 px-4 rounded-lg bg-leaf text-cream text-[13px] font-bold hover:brightness-110 disabled:opacity-60" data-hover>
                      <CheckCircle2 size={15} /> {busy ? "Khul raha…" : "Khata kholo"}
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key={cust.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-cream text-espresso rounded-xl shadow-lift overflow-hidden ticket-notch">
                <div className="bg-espresso-deep text-cream px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-display font-black text-xl leading-none">{cust.name}</p>
                    <p className="led text-[11.5px] text-gold mt-1">{cust.phone}</p>
                  </div>
                  <span className="led text-[10px] tracking-[0.2em] text-cream/45 uppercase">member {new Date(cust.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                </div>
                <div className="px-5 py-5 text-center">
                  <p className="text-[10.5px] font-bold tracking-[0.24em] text-espresso/50 uppercase">Sakhar ke dane</p>
                  <p className="led text-[56px] font-bold text-saffron-deep leading-none mt-1">{cust.dane}</p>
                  <p className="font-hand text-xl text-espresso/55 mt-1">{cust.dane >= 100 ? "inaam ke layak!" : "thode aur dane chahiye"}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {cust && (
          <div className="space-y-4">
            <div className="bg-coal-2/80 border border-cream/10 rounded-xl p-5">
              <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-cream/45 uppercase mb-3"><Gift size={14} /> Inaam do (redeem)</p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {REWARD_TIERS.map((t) => {
                  const ok = cust.dane >= t.grains;
                  return (
                    <motion.button
                      key={t.grains}
                      whileTap={ok ? { scale: 0.96 } : undefined}
                      onClick={() => ok && void redeem(t.grains, t.reward)}
                      disabled={!ok || busy}
                      className={`text-left rounded-xl border p-3.5 transition-colors ${ok ? "border-gold/60 bg-gold/10 hover:bg-gold/20 cursor-pointer" : "border-cream/10 bg-coal-3/40 opacity-45 cursor-not-allowed"}`}
                      data-hover
                    >
                      <p className="led text-[13px] font-bold text-gold">{t.grains} dane</p>
                      <p className="text-[13.5px] font-bold text-cream mt-0.5">{t.reward}</p>
                      <p className="font-hand text-[15px] text-cream/45">{t.hindi}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="bg-coal-2/80 border border-cream/10 rounded-xl p-5">
              <p className="text-[11px] font-bold tracking-[0.2em] text-cream/45 uppercase mb-3">Manually dane jodo (goodwill)</p>
              <div className="flex gap-2">
                <input value={creditAmt} onChange={(e) => setCreditAmt(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 50" inputMode="numeric" className={`led flex-1 h-11 px-4 rounded-lg bg-coal-3 border border-cream/12 text-cream placeholder:text-cream/25 focus:border-led text-[14px]`} />
                <button onClick={() => void credit()} disabled={busy} className="flex items-center gap-2 h-11 px-4 rounded-lg bg-led text-coal text-[13px] font-bold hover:bg-gold disabled:opacity-50" data-hover>
                  <Plus size={15} /> Dane jodo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── INVENTORY ───────────────────────── */
const CATS: { id: Category; label: string }[] = [
  { id: "sweets", label: "Mithai" },
  { id: "dairy", label: "Doodh & Dairy" },
  { id: "snacks", label: "Chaat & Snacks" },
  { id: "drinks", label: "Thanda" },
];

const blankProduct = (): ProductUpsert => ({
  id: "", name: "", hindi: "", category: "sweets", desc: "", story: "", heritage: "",
  craft: [], purity: [], since: new Date().getFullYear(), image: "", tag: "",
  units: [{ label: "250g", price: 100 }], sort: 99,
});

export function AdminProducts() {
  const [items, setItems] = useState<Product[] | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductUpsert | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await listAllProducts();
    setItems(res.data);
    if (res.error) setErr(res.error);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const flip = async (p: Product) => {
    const active = (p as Product & { is_active?: boolean }).is_active !== false;
    const res = await toggleProduct(p.id, !active);
    if (res.error) setErr(res.error);
    await load();
  };

  const startEdit = (p?: Product) => {
    if (!p) return setEditing(blankProduct());
    setEditing({
      id: p.id, name: p.name, hindi: p.hindi, category: p.category, desc: p.desc,
      story: p.story, heritage: p.heritage, craft: p.craft ?? [], purity: p.purity ?? [],
      since: p.since ?? 1974, image: p.image, tag: p.tag ?? "",
      units: p.units.length ? p.units : [{ label: "250g", price: 100 }], sort: 50,
    });
  };

  const save = async () => {
    if (!editing) return;
    if (editing.name.trim().length < 2) return setErr("Naam toh do.");
    if (!editing.id.trim()) return setErr("Product ID do (english, bina space — jaise 'kesar-peda').");
    if (editing.units.length === 0 || editing.units.some((u) => !u.label || u.price <= 0))
      return setErr("Har pack ka naam aur sahi price do.");
    setErr("");
    const payload = { ...editing, id: editing.id.trim().toLowerCase().replace(/\s+/g, "-") };
    const res = await upsertProduct(payload);
    if (res.error) return setErr("Save nahi hua: " + res.error);
    setMsg(`"${payload.name}" save ho gaya!`);
    setEditing(null);
    await load();
    window.setTimeout(() => setMsg(""), 3000);
  };

  const setUnit = (i: number, patch: Partial<UnitOption>) =>
    setEditing((e) => (e ? { ...e, units: e.units.map((u, j) => (j === i ? { ...u, ...patch } : u)) } : e));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-black text-3xl">Mithai ki <span className="text-led">tijori</span></h1>
          <p className="text-[13px] font-semibold text-cream/45 mt-1">Naya item jodo, price badlo, ya cheez chhupa do.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="flex items-center gap-2 h-10 px-4 rounded-lg border border-cream/15 text-[13px] font-bold text-cream/70 hover:text-led hover:border-led transition-colors" data-hover>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => startEdit()} className="flex items-center gap-2 h-10 px-4 rounded-lg bg-led text-coal text-[13px] font-bold hover:bg-gold" data-hover>
            <Plus size={15} /> Naya item
          </button>
        </div>
      </div>
      <ErrBox msg={err} /><OkBox msg={msg} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {(items ?? []).map((p) => {
          const active = (p as Product & { is_active?: boolean }).is_active !== false;
          const minPrice = Math.min(...p.units.map((u) => u.price));
          return (
            <motion.div key={p.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={`bg-coal-2/80 border border-cream/10 rounded-xl overflow-hidden ${active ? "" : "opacity-50"}`}>
              <div className="relative h-32">
                <img src={p.image} alt={p.name} draggable={false} className="w-full h-full object-cover" />
                <span className="absolute top-2.5 left-2.5 text-[9.5px] font-bold tracking-wider uppercase bg-coal/80 text-gold px-2 py-1 rounded-full">{p.category}</span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-bold text-[16px] leading-tight">{p.name}</p>
                    <p className="text-[11px] font-semibold text-cream/45">{p.units.length} pack · {inr(minPrice)} se</p>
                  </div>
                  <button onClick={() => void flip(p)} className={`shrink-0 w-11 h-6 rounded-full relative transition-colors ${active ? "bg-leaf" : "bg-coal-3 border border-cream/20"}`} data-hover title={active ? "Chhupa do" : "Dikhao"}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-cream transition-all ${active ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                <button onClick={() => startEdit(p)} className="mt-3 flex items-center gap-1.5 text-[12.5px] font-bold text-led hover:text-gold transition-colors" data-hover>
                  <Pencil size={13} /> Edit karo
                </button>
              </div>
            </motion.div>
          );
        })}
        {items !== null && items.length === 0 && (
          <p className="col-span-full text-[13px] font-semibold text-cream/40 py-10 text-center">
            Koi product nahi — "Naya item" se pehli mithai jodo. <Package size={16} className="inline ml-1" />
          </p>
        )}
      </div>

      {/* editor */}
      <AnimatePresence>
        {editing && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditing(null)} className="fixed inset-0 z-[90] bg-coal/80 backdrop-blur-sm" />
            <div className="fixed inset-0 z-[91] grid place-items-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="pointer-events-auto w-full max-w-2xl bg-coal-2 border border-cream/15 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-black text-2xl">{items?.some((p) => p.id === editing.id) ? "Item edit karo" : "Naya item"}</h2>
                  <button onClick={() => setEditing(null)} className="w-9 h-9 grid place-items-center rounded-full border border-cream/20 hover:bg-cream/10" data-hover><Trash2 size={0} className="hidden" /><span className="text-cream/70 font-bold">✕</span></button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3.5">
                  <div><label className={labelCls}>Naam</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Kesar Peda" className={inputCls} /></div>
                  <div><label className={labelCls}>Product ID</label><input value={editing.id} onChange={(e) => setEditing({ ...editing, id: e.target.value })} placeholder="kesar-peda" className={inputCls} disabled={items?.some((p) => p.id === editing.id)} /></div>
                  <div><label className={labelCls}>Hindi</label><input value={editing.hindi} onChange={(e) => setEditing({ ...editing, hindi: e.target.value })} placeholder="केसर पेड़ा" className={inputCls} /></div>
                  <div>
                    <label className={labelCls}>Category</label>
                    <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as Category })} className={inputCls}>
                      {CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2"><label className={labelCls}>Chhota description</label><input value={editing.desc} onChange={(e) => setEditing({ ...editing, desc: e.target.value })} className={inputCls} /></div>
                  <div className="sm:col-span-2"><label className={labelCls}>Photo URL</label><input value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} placeholder="https://…" className={inputCls} /></div>
                  <div><label className={labelCls}>Tag (optional)</label><input value={editing.tag} onChange={(e) => setEditing({ ...editing, tag: e.target.value })} placeholder="Bestseller" className={inputCls} /></div>
                  <div><label className={labelCls}>Since (saal)</label><input value={editing.since} onChange={(e) => setEditing({ ...editing, since: Number(e.target.value) || 1974 })} inputMode="numeric" className={inputCls} /></div>
                </div>

                <p className={labelCls + " mt-4"}>Packs & price</p>
                <div className="space-y-2">
                  {editing.units.map((u, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={u.label} onChange={(e) => setUnit(i, { label: e.target.value })} placeholder="250g" className={inputCls + " flex-1"} />
                      <input value={u.price} onChange={(e) => setUnit(i, { price: Number(e.target.value) || 0 })} placeholder="₹" inputMode="numeric" className={inputCls + " w-28"} />
                      <button onClick={() => setEditing({ ...editing, units: editing.units.filter((_, j) => j !== i) })} className="w-11 grid place-items-center rounded-lg border border-cream/15 text-cream/40 hover:text-chili" data-hover><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button onClick={() => setEditing({ ...editing, units: [...editing.units, { label: "", price: 0 }] })} className="flex items-center gap-1.5 text-[12.5px] font-bold text-led hover:text-gold" data-hover>
                    <Plus size={14} /> Pack jodo
                  </button>
                </div>

                <div className="flex gap-2.5 mt-6">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => void save()} className="flex-1 h-12 rounded-lg bg-led text-coal font-bold text-[14px] hover:bg-gold transition-colors" data-hover>
                    Save karo
                  </motion.button>
                  <button onClick={() => setEditing(null)} className="h-12 px-5 rounded-lg border border-cream/20 text-[13.5px] font-bold text-cream/60 hover:text-cream" data-hover>
                    Rehne do
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
