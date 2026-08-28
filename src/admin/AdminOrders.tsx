/* ── Kapila Counter · manual order builder (walk-in customers) ─────── */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Banknote, CheckCircle2, Minus, Plus, QrCode, Trash2, UserRound } from "lucide-react";
import { fetchProducts } from "../lib/supabase";
import { createCounterOrder, creditDane, findCustomer } from "../lib/admin";
import { grainsFrom, inr, makeOrderId, type Product, type UnitOption } from "../lib/data";

interface Line {
  key: string;
  id: string;
  name: string;
  pack: string;
  price: number;
  qty: number;
}

const PAY_OPTS: { id: "counter" | "online"; label: string; hint: string; icon: typeof Banknote }[] = [
  { id: "counter", label: "Cash / UPI liya", hint: "abhi paisa le liya", icon: Banknote },
  { id: "online", label: "Online aayega", hint: "baad mein pakka hoga", icon: QrCode },
];

export function AdminOrders() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pickId, setPickId] = useState("");
  const [pickUnit, setPickUnit] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pay, setPay] = useState<"counter" | "online">("counter");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [doneId, setDoneId] = useState("");
  const [daneNote, setDaneNote] = useState("");

  useEffect(() => {
    void fetchProducts().then((p) => setProducts(p));
  }, []);

  const picked = useMemo(() => products.find((p) => p.id === pickId) ?? null, [products, pickId]);
  const unit: UnitOption | null = picked ? picked.units[pickUnit] ?? picked.units[0] : null;

  const addLine = () => {
    if (!picked || !unit) return;
    const key = `${picked.id}__${unit.label}`;
    setLines((ls) => {
      const hit = ls.find((l) => l.key === key);
      if (hit) return ls.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { key, id: picked.id, name: picked.name, pack: unit.label, price: unit.price, qty: 1 }];
    });
  };
  const setQty = (key: string, d: number) =>
    setLines((ls) =>
      ls
        .map((l) => (l.key === key ? { ...l, qty: l.qty + d } : l))
        .filter((l) => l.qty > 0)
    );

  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const grains = grainsFrom(total);

  const submit = async () => {
    if (lines.length === 0) return setErr("Pehle kuch item toh jodo.");
    if (name.trim().length < 2) return setErr("Customer ka naam likho.");
    if (!/^\d{10}$/.test(phone)) return setErr("Phone 10 digit ka hona chahiye.");
    setErr("");
    setBusy(true);
    setDaneNote("");

    /* if this phone has a khata, credit the dane automatically */
    const cust = await findCustomer(phone);
    let credited = false;
    if (cust.data && cust.data.length > 0 && grains > 0) {
      const c = await creditDane(phone, grains);
      credited = !c.error;
    }

    const orderId = makeOrderId();
    const res = await createCounterOrder({
      orderId,
      name: name.trim(),
      phone,
      pickup: "Counter pe",
      payment: pay,
      paid: pay === "counter",
      total,
      grains,
      items: lines.map((l) => ({ id: l.id, name: l.name, pack: l.pack, qty: l.qty, price: l.price })),
    });
    setBusy(false);
    if (res.error) return setErr("Order nahi bana: " + res.error);
    setDoneId(orderId);
    if (credited) setDaneNote(`+${grains} sakhar ke dane ${name.split(" ")[0]} ke khate mein jud gaye!`);
    setLines([]);
    setName("");
    setPhone("");
  };

  const inputCls =
    "w-full h-11 px-4 rounded-lg bg-coal-3 border border-cream/12 text-cream placeholder:text-cream/25 focus:border-led text-[14px] font-medium";

  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-5 items-start">
      {/* left: builder */}
      <div className="space-y-4">
        <div className="bg-coal-2/80 border border-cream/10 rounded-xl p-5">
          <h1 className="font-display font-black text-2xl">
            Counter se <span className="text-led">order</span> banao
          </h1>
          <p className="text-[12.5px] font-semibold text-cream/45 mt-1">
            Jo customer website use nahi karte — unka order yahan se.
          </p>

          {/* product picker */}
          <div className="mt-5 grid sm:grid-cols-[1.4fr_1fr_auto] gap-2.5 items-end">
            <div>
              <label className="block text-[10.5px] font-bold tracking-[0.2em] text-cream/45 uppercase mb-1.5">Mithai / item</label>
              <select
                value={pickId}
                onChange={(e) => {
                  setPickId(e.target.value);
                  setPickUnit(0);
                }}
                className={inputCls + " appearance-none"}
              >
                <option value="">— chuno —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10.5px] font-bold tracking-[0.2em] text-cream/45 uppercase mb-1.5">Pack</label>
              <select
                value={pickUnit}
                onChange={(e) => setPickUnit(Number(e.target.value))}
                disabled={!picked}
                className={inputCls + " appearance-none disabled:opacity-40"}
              >
                {(picked?.units ?? []).map((u, i) => (
                  <option key={u.label} value={i}>
                    {u.label} · {inr(u.price)}
                  </option>
                ))}
              </select>
            </div>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={addLine}
              disabled={!picked}
              className="h-11 px-5 rounded-lg bg-led text-coal text-[13.5px] font-bold hover:bg-gold disabled:opacity-40 flex items-center gap-1.5"
            >
              <Plus size={16} strokeWidth={3} /> Jodo
            </motion.button>
          </div>

          {/* lines */}
          <div className="mt-4 space-y-2">
            <AnimatePresence>
              {lines.map((l) => (
                <motion.div
                  key={l.key}
                  layout
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 bg-coal-3/70 border border-cream/8 rounded-lg px-3.5 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-cream truncate">{l.name}</p>
                    <p className="led text-[11px] text-cream/40">{l.pack} · {inr(l.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setQty(l.key, -1)} className="w-8 h-8 grid place-items-center rounded-md bg-coal border border-cream/15 text-cream/70 hover:text-chili hover:border-chili transition-colors" aria-label="kam">
                      <Minus size={14} />
                    </button>
                    <span className="led w-7 text-center text-[14px] font-bold text-cream">{l.qty}</span>
                    <button onClick={() => setQty(l.key, 1)} className="w-8 h-8 grid place-items-center rounded-md bg-coal border border-cream/15 text-cream/70 hover:text-led hover:border-led transition-colors" aria-label="zyada">
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="led text-[14px] font-bold text-led w-16 text-right">{inr(l.price * l.qty)}</span>
                  <button onClick={() => setQty(l.key, -l.qty)} className="text-cream/30 hover:text-chili transition-colors" aria-label="hatao">
                    <Trash2 size={15} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {lines.length === 0 && (
              <p className="text-center text-cream/30 text-[13px] font-semibold py-6 border border-dashed border-cream/12 rounded-lg">
                Abhi thela khaali — item chuno aur "Jodo" dabao.
              </p>
            )}
          </div>
        </div>

        {/* customer */}
        <div className="bg-coal-2/80 border border-cream/10 rounded-xl p-5">
          <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-cream/45 uppercase mb-3">
            <UserRound size={14} /> Customer
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam" className={inputCls} />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="Phone (10 digit)"
              inputMode="numeric"
              className={inputCls + " led tracking-widest"}
            />
          </div>
          <p className="text-[11.5px] font-semibold text-cream/40 mt-2.5">
            Agar is phone pe khata hai toh <b className="text-led">{grains} dane</b> khud jud jayenge.
          </p>

          {/* payment */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {PAY_OPTS.map((o) => {
              const Icon = o.icon;
              const active = pay === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => setPay(o.id)}
                  className={`rounded-lg border p-3.5 text-left transition-all ${
                    active ? "border-led bg-led/10" : "border-cream/12 bg-coal-3/50 hover:border-cream/30"
                  }`}
                >
                  <Icon size={18} className={active ? "text-led" : "text-cream/40"} />
                  <p className="text-[13.5px] font-bold text-cream mt-1.5">{o.label}</p>
                  <p className="text-[11px] font-semibold text-cream/40">{o.hint}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* right: summary */}
      <div className="lg:sticky lg:top-32 bg-coal-2/80 border border-cream/10 rounded-xl p-5">
        <p className="text-[11px] font-bold tracking-[0.2em] text-cream/45 uppercase">Pura hisaab</p>
        <ul className="mt-3 space-y-2">
          {lines.map((l) => (
            <li key={l.key} className="flex justify-between text-[13px] font-semibold text-cream/75">
              <span className="truncate">
                {l.name} <span className="text-cream/35">×{l.qty}</span>
              </span>
              <span className="led">{inr(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-4 border-t border-dashed border-cream/15 flex items-center justify-between">
          <span className="text-[12px] font-bold tracking-wider text-cream/50">KUL JOD</span>
          <span className="led text-3xl font-bold text-led">{inr(total)}</span>
        </div>
        <p className="led text-[11.5px] text-cream/40 mt-1.5 text-right">+{grains} dane is order pe</p>

        {err && <p className="text-chili text-[12.5px] font-bold mt-3">{err}</p>}

        <AnimatePresence>
          {doneId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-leaf/10 border border-leaf/40 rounded-lg px-4 py-3"
            >
              <p className="flex items-center gap-2 text-leaf text-[13px] font-bold">
                <CheckCircle2 size={16} /> Order {doneId} ban gaya!
              </p>
              {daneNote && <p className="text-[12px] font-semibold text-cream/60 mt-1">{daneNote}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => void submit()}
          disabled={busy}
          className="mt-4 w-full h-12 rounded-lg bg-led text-coal font-bold text-[15px] hover:bg-gold disabled:opacity-50 transition-colors"
        >
          {busy ? "Ban raha…" : `Order pakka karo · ${inr(total)}`}
        </motion.button>
        <p className="text-center text-[11px] font-semibold text-cream/35 mt-2.5">
          {pay === "counter" ? "Paid mark ho jayega" : "Payment baad mein collect hoga"}
        </p>
      </div>
    </div>
  );
}
