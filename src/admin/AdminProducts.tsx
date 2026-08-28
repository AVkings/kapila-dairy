/* ── Kapila Counter · inventory (add / edit / toggle products) ─────── */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Pencil, Plus, RefreshCw, X } from "lucide-react";
import { listAllProducts, toggleProduct, upsertProduct, type ProductUpsert } from "../lib/admin";
import { inr, type Category, type Product, type UnitOption } from "../lib/data";

const CATS: { id: Category; label: string }[] = [
  { id: "sweets", label: "Mithai" },
  { id: "dairy", label: "Doodh & Dairy" },
  { id: "snacks", label: "Chaat & Snacks" },
  { id: "drinks", label: "Thanda" },
];

const blank = (): ProductUpsert => ({
  id: "",
  name: "",
  hindi: "",
  category: "sweets",
  desc: "",
  story: "",
  heritage: "",
  craft: [],
  purity: [],
  since: new Date().getFullYear(),
  image: "",
  tag: "",
  units: [{ label: "250g", price: 100 }],
  sort: 99,
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
  useEffect(() => {
    void load();
  }, []);

  const flip = async (p: Product) => {
    const active = (p as Product & { is_active?: boolean }).is_active !== false;
    const res = await toggleProduct(p.id, !active);
    if (res.error) setErr(res.error);
    await load();
  };

  const startEdit = (p?: Product) => {
    if (!p) return setEditing(blank());
    setEditing({
      id: p.id,
      name: p.name,
      hindi: p.hindi,
      category: p.category,
      desc: p.desc,
      story: p.story,
      heritage: p.heritage,
      craft: p.craft ?? [],
      purity: p.purity ?? [],
      since: p.since ?? 1974,
      image: p.image,
      tag: p.tag ?? "",
      units: p.units.length ? p.units : [{ label: "250g", price: 100 }],
      sort: 50,
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
    setEditing((e) =>
      e ? { ...e, units: e.units.map((u, j) => (j === i ? { ...u, ...patch } : u)) } : e
    );

  const inputCls =
    "w-full h-11 px-4 rounded-lg bg-coal-3 border border-cream/12 text-cream placeholder:text-cream/25 focus:border-led text-[14px] font-medium";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-black text-3xl">
            Mithai ki <span className="text-led">tijori</span>
          </h1>
          <p className="text-[13px] font-semibold text-cream/45 mt-1">
            Naya item jodo, price badlo, ya cheez chhupa do.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="flex items-center gap-2 h-10 px-4 rounded-lg border border-cream/15 text-[13px] font-bold text-cream/70 hover:text-led hover:border-led transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={() => startEdit()}
            className="flex items-center gap-2 h-10 px-4 rounded-lg bg-led text-coal text-[13px] font-bold hover:bg-gold"
          >
            <Plus size={15} /> Naya item
          </button>
        </div>
      </div>

      {err && <div className="bg-chili/10 border border-chili/40 text-chili rounded-xl px-4 py-3 text-[13px] font-bold">{err}</div>}
      {msg && (
        <div className="bg-leaf/10 border border-leaf/40 text-leaf rounded-xl px-4 py-3 text-[13px] font-bold flex items-center gap-2">
          <CheckCircle2 size={16} /> {msg}
        </div>
      )}

      {/* list */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {(items ?? []).map((p) => {
          const active = (p as Product & { is_active?: boolean }).is_active !== false;
          const minPrice = Math.min(...p.units.map((u) => u.price));
          return (
            <motion.div
              key={p.id}
              layout
              className={`bg-coal-2/80 border rounded-xl overflow-hidden transition-all ${
                active ? "border-cream/10" : "border-cream/5 opacity-60"
              }`}
            >
              <div className="relative h-32">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                <span className="absolute top-2.5 left-2.5 led text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-md bg-coal/80 text-cream/80">
                  {CATS.find((c) => c.id === p.category)?.label}
                </span>
                {!active && (
                  <span className="absolute top-2.5 right-2.5 stamp text-[10px] text-chili border-chili/70 bg-coal/70">HIDDEN</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-bold text-[16px] text-cream leading-tight">{p.name}</p>
                    <p className="led text-[11px] text-cream/40 mt-0.5">{inr(minPrice)} se · {p.units.length} pack</p>
                  </div>
                  <button
                    onClick={() => startEdit(p)}
                    className="shrink-0 w-9 h-9 grid place-items-center rounded-lg border border-cream/15 text-cream/60 hover:text-led hover:border-led transition-colors"
                    aria-label="edit"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={() => void flip(p)}
                    className={`relative w-12 h-7 rounded-full transition-colors ${active ? "bg-leaf" : "bg-coal-3 border border-cream/15"}`}
                    aria-label="toggle"
                  >
                    <motion.span
                      animate={{ x: active ? 22 : 3 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-5 h-5 rounded-full bg-cream shadow"
                    />
                  </button>
                  <span className="led text-[10.5px] text-cream/40">{active ? "BIK RAHA HAI" : "CHHUPA HUA"}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
        {!items && <p className="text-cream/30 text-sm col-span-full text-center py-10">load ho raha…</p>}
      </div>

      {/* editor */}
      <AnimatePresence>
        {editing && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditing(null)}
              className="fixed inset-0 z-[80] bg-coal/80 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-[81] grid place-items-center p-4 pointer-events-none overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="pointer-events-auto w-full max-w-lg bg-coal-2 border border-cream/12 rounded-2xl p-6 shadow-lift my-8 max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-black text-2xl text-cream">
                    {items?.some((p) => p.id === editing.id) ? "Item badlo" : "Naya item"}
                  </h2>
                  <button onClick={() => setEditing(null)} className="w-9 h-9 grid place-items-center rounded-lg border border-cream/15 text-cream/60 hover:text-chili hover:border-chili" aria-label="band">
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold tracking-[0.18em] text-cream/45 uppercase mb-1.5">Naam</label>
                    <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Kesar Peda" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold tracking-[0.18em] text-cream/45 uppercase mb-1.5">ID</label>
                    <input value={editing.id} onChange={(e) => setEditing({ ...editing, id: e.target.value })} placeholder="kesar-peda" className={inputCls + " led"} />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold tracking-[0.18em] text-cream/45 uppercase mb-1.5">Category</label>
                    <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as Category })} className={inputCls + " appearance-none"}>
                      {CATS.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold tracking-[0.18em] text-cream/45 uppercase mb-1.5">Since (saal)</label>
                    <input value={editing.since} onChange={(e) => setEditing({ ...editing, since: Number(e.target.value) || 1974 })} inputMode="numeric" className={inputCls + " led"} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10.5px] font-bold tracking-[0.18em] text-cream/45 uppercase mb-1.5">Photo URL</label>
                    <input value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} placeholder="https://…/photo.jpg" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10.5px] font-bold tracking-[0.18em] text-cream/45 uppercase mb-1.5">Tag (optional)</label>
                    <input value={editing.tag} onChange={(e) => setEditing({ ...editing, tag: e.target.value })} placeholder="Sabse Bikau" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10.5px] font-bold tracking-[0.18em] text-cream/45 uppercase mb-1.5">Desc</label>
                    <textarea value={editing.desc} onChange={(e) => setEditing({ ...editing, desc: e.target.value })} rows={2} className={inputCls + " h-auto py-3 resize-none"} />
                  </div>
                </div>

                {/* units */}
                <p className="text-[10.5px] font-bold tracking-[0.18em] text-cream/45 uppercase mt-4 mb-2">Packs & price</p>
                <div className="space-y-2">
                  {editing.units.map((u, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={u.label} onChange={(e) => setUnit(i, { label: e.target.value })} placeholder="250g" className={inputCls + " flex-1"} />
                      <input value={u.price || ""} onChange={(e) => setUnit(i, { price: Number(e.target.value) || 0 })} placeholder="₹" inputMode="numeric" className={inputCls + " led w-24"} />
                      <button onClick={() => setEditing({ ...editing, units: editing.units.filter((_, j) => j !== i) })} className="w-11 grid place-items-center rounded-lg border border-cream/15 text-cream/50 hover:text-chili hover:border-chili" aria-label="hatao">
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setEditing({ ...editing, units: [...editing.units, { label: "", price: 0 }] })}
                    className="flex items-center gap-1.5 text-[12.5px] font-bold text-led hover:text-gold"
                  >
                    <Plus size={14} /> Pack jodo
                  </button>
                </div>

                <div className="flex gap-2.5 mt-6">
                  <button onClick={() => setEditing(null)} className="flex-1 h-12 rounded-lg border border-cream/15 text-[14px] font-bold text-cream/70 hover:text-cream">
                    Rehne do
                  </button>
                  <button onClick={() => void save()} className="flex-1 h-12 rounded-lg bg-led text-coal text-[14px] font-bold hover:bg-gold">
                    Save karo
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
