/* ── Kapila Counter · dane khata (lookup · create · redeem · credit) ── */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Gift, Minus, Plus, Search, Sparkles, UserPlus } from "lucide-react";
import {
  createCustomer,
  creditDane,
  findCustomer,
  spendDane,
  type AdminCustomer,
} from "../lib/admin";
import { REWARD_TIERS } from "../lib/data";

/* ── naya khata (counter se customer banao) ── */
function NewKhata({
  defaultPhone,
  onCreated,
}: {
  defaultPhone: string;
  onCreated: (c: AdminCustomer) => void;
}) {
  const [name, setName] = useState("");
  const [ph, setPh] = useState(defaultPhone);
  const [welcome, setWelcome] = useState("0");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (defaultPhone) setPh(defaultPhone);
  }, [defaultPhone]);

  const create = async () => {
    if (name.trim().length < 2) return setErr("Customer ka naam do (2+ akshar).");
    if (!/^\d{10}$/.test(ph)) return setErr("Phone 10 digit ka hona chahiye.");
    const w = Math.max(0, Math.floor(Number(welcome) || 0));
    setErr("");
    setBusy(true);
    const res = await createCustomer(name.trim(), ph, w);
    setBusy(false);
    if (res.error) return setErr("Khata nahi khula: " + res.error);
    setName("");
    setWelcome("0");
    onCreated({
      id: res.data ?? "",
      name: name.trim(),
      phone: ph,
      dane: w,
      created_at: new Date().toISOString(),
    });
  };

  const inputCls =
    "h-11 px-4 rounded-lg bg-coal-3 border border-cream/12 text-cream placeholder:text-cream/25 focus:border-led text-[14px] font-medium";

  return (
    <div className="bg-coal-2/80 border border-led/25 rounded-xl p-5">
      <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-led uppercase mb-3">
        <UserPlus size={14} /> Naya khata kholo
      </p>
      <div className="grid sm:grid-cols-[1.2fr_1fr] gap-2.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Naam — e.g. Suresh Yadav"
          className={inputCls}
        />
        <input
          value={ph}
          onChange={(e) => setPh(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Phone (10 digit)"
          inputMode="numeric"
          className={inputCls + " led tracking-widest"}
        />
      </div>
      <div className="flex gap-2.5 mt-2.5 items-center">
        <input
          value={welcome}
          onChange={(e) => setWelcome(e.target.value.replace(/\D/g, "").slice(0, 5))}
          placeholder="0"
          inputMode="numeric"
          className={inputCls + " led w-24 text-center"}
          aria-label="Welcome dane"
        />
        <span className="text-[11.5px] font-bold text-cream/45 leading-tight">
          welcome dane
          <br />
          (optional)
        </span>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => void create()}
          disabled={busy}
          className="ml-auto flex items-center gap-2 h-11 px-5 rounded-lg bg-led text-coal text-[13.5px] font-bold hover:bg-gold disabled:opacity-50"
        >
          <UserPlus size={15} /> {busy ? "…" : "Khata kholo"}
        </motion.button>
      </div>
      {err && <p className="text-chili text-[12.5px] font-bold mt-3">{err}</p>}
    </div>
  );
}

export function AdminCustomers() {
  const [phone, setPhone] = useState("");
  const [cust, setCust] = useState<AdminCustomer | null>(null);
  const [found, setFound] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [spendAmt, setSpendAmt] = useState("");
  const [creditAmt, setCreditAmt] = useState("");
  const [msg, setMsg] = useState("");

  const lookup = async () => {
    if (!/^\d{10}$/.test(phone)) return setErr("Phone 10 digit ka daalo.");
    setErr("");
    setMsg("");
    setBusy(true);
    const res = await findCustomer(phone);
    setBusy(false);
    if (res.error) return setErr("Khata nahi mila: " + res.error);
    if (!res.data || res.data.length === 0) {
      setCust(null);
      setFound(true);
      return;
    }
    setCust(res.data[0]);
    setFound(true);
  };

  const redeem = async (amount: number, what: string) => {
    if (!cust) return;
    setMsg("");
    setErr("");
    setBusy(true);
    const res = await spendDane(cust.phone, amount);
    setBusy(false);
    if (res.error) return setErr(what + " nahi hua: " + res.error);
    setCust({ ...cust, dane: res.data ?? cust.dane - amount });
    setMsg(`${what} ho gaya! ${amount} dane kaate, ab ${res.data ?? cust.dane - amount} bache.`);
    setSpendAmt("");
  };

  const credit = async () => {
    if (!cust) return;
    const amt = Number(creditAmt);
    if (!amt || amt <= 0) return setErr("Kitne dane dene hain — number daalo.");
    setMsg("");
    setErr("");
    setBusy(true);
    const res = await creditDane(cust.phone, amt);
    setBusy(false);
    if (res.error) return setErr("Dane nahi jude: " + res.error);
    setCust({ ...cust, dane: res.data ?? cust.dane + amt });
    setMsg(`+${amt} dane ${cust.name.split(" ")[0]} ke khate mein jud gaye.`);
    setCreditAmt("");
  };

  const achievable = useMemo(
    () => (cust ? REWARD_TIERS.filter((t) => cust.dane >= t.grains) : []),
    [cust]
  );

  const inputCls =
    "led h-12 px-4 rounded-lg bg-coal-3 border border-cream/12 text-cream placeholder:text-cream/25 focus:border-led text-[15px] tracking-widest";

  return (
    <div className="grid lg:grid-cols-[1fr_1.2fr] gap-5 items-start">
      {/* left: lookup */}
      <div className="space-y-4">
        <div className="bg-coal-2/80 border border-cream/10 rounded-xl p-5">
          <h1 className="font-display font-black text-2xl">
            Dane <span className="text-led">khata</span>
          </h1>
          <p className="text-[12.5px] font-semibold text-cream/45 mt-1">
            Customer ka phone daalo — balance dekho, inaam do.
          </p>
          <div className="flex gap-2 mt-4">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onKeyDown={(e) => e.key === "Enter" && void lookup()}
              placeholder="98765 43210"
              inputMode="numeric"
              className={inputCls + " flex-1"}
            />
            <button
              onClick={() => void lookup()}
              disabled={busy}
              className="flex items-center gap-2 h-12 px-5 rounded-lg bg-led text-coal text-[13.5px] font-bold hover:bg-gold disabled:opacity-50"
            >
              <Search size={16} /> {busy ? "…" : "Dekho"}
            </button>
          </div>
          {err && <p className="text-chili text-[12.5px] font-bold mt-3">{err}</p>}
        </div>

        {/* create customer right from the counter */}
        <NewKhata
          defaultPhone={phone}
          onCreated={(c) => {
            setCust(c);
            setFound(true);
            setPhone(c.phone);
            setErr("");
            setMsg(`Naya khata khul gaya — ${c.name} (${c.phone}) · ${c.dane} dane ke saath.`);
          }}
        />

        {/* result */}
        <AnimatePresence mode="wait">
          {!found ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-coal-2/50 border border-dashed border-cream/15 rounded-xl min-h-[220px] grid place-items-center"
            >
              <div className="text-center px-6">
                <Sparkles size={26} className="mx-auto text-led/50" />
                <p className="font-hand text-2xl text-cream/40 mt-2">khata yahan khulega…</p>
              </div>
            </motion.div>
          ) : !cust ? (
            <motion.div
              key="none"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-coal-2/80 border border-chili/30 rounded-xl p-5"
            >
              <p className="font-display font-bold text-lg text-chili">Is number pe khata nahi hai</p>
              <p className="text-[13px] font-semibold text-cream/50 mt-1.5 leading-relaxed">
                Upar <b className="text-led">"Naya khata kholo"</b> card use karo — number pehle se
                bhara hai. Ya customer khud website pe login kare toh khata khud ban jayega.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={cust.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-cream text-espresso rounded-xl shadow-lift overflow-hidden ticket-notch"
            >
              <div className="bg-espresso-deep text-cream px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-display font-black text-xl leading-none">{cust.name}</p>
                  <p className="led text-[11.5px] text-gold mt-1">{cust.phone}</p>
                </div>
                <span className="led text-[10px] tracking-[0.2em] text-cream/45 uppercase">
                  member since {new Date(cust.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="px-5 py-5 text-center">
                <p className="text-[10.5px] font-bold tracking-[0.24em] text-espresso/50 uppercase">Sakhar ke dane</p>
                <p className="led text-[56px] font-bold text-saffron-deep leading-none mt-1">{cust.dane}</p>
                <p className="font-hand text-xl text-espresso/55 mt-1">
                  {cust.dane >= 100 ? "inaam ke layak!" : "thode aur dane chahiye"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* right: actions */}
      <div className="space-y-4">
        {cust && (
          <>
            {/* redeem tiers */}
            <div className="bg-coal-2/80 border border-cream/10 rounded-xl p-5">
              <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-cream/45 uppercase mb-3">
                <Gift size={14} /> Inaam do (redeem)
              </p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {REWARD_TIERS.map((t) => {
                  const ok = cust.dane >= t.grains;
                  return (
                    <motion.button
                      key={t.grains}
                      whileTap={ok ? { scale: 0.96 } : undefined}
                      onClick={() => ok && void redeem(t.grains, t.reward)}
                      disabled={!ok || busy}
                      className={`rounded-lg border p-3.5 text-left transition-all ${
                        ok
                          ? "border-led/60 bg-led/10 hover:bg-led/20"
                          : "border-cream/10 bg-coal-3/40 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <p className="led text-[13px] font-bold text-led">{t.grains} dane</p>
                      <p className="text-[13.5px] font-bold text-cream mt-0.5">{t.reward}</p>
                      <p className="text-[11px] font-semibold text-cream/40">
                        {ok ? "dene layak ✓" : `${t.grains - cust.dane} dane kam`}
                      </p>
                    </motion.button>
                  );
                })}
              </div>

              {/* custom spend */}
              <div className="flex gap-2 mt-3.5">
                <input
                  value={spendAmt}
                  onChange={(e) => setSpendAmt(e.target.value.replace(/\D/g, ""))}
                  placeholder="Custom dane"
                  inputMode="numeric"
                  className={inputCls + " flex-1 tracking-normal"}
                />
                <button
                  onClick={() => spendAmt && void redeem(Number(spendAmt), "Custom redeem")}
                  disabled={busy || !spendAmt}
                  className="flex items-center gap-2 h-12 px-4 rounded-lg bg-chili/20 border border-chili/50 text-chili text-[13px] font-bold hover:bg-chili/30 disabled:opacity-40"
                >
                  <Minus size={15} /> Kaato
                </button>
              </div>
            </div>

            {/* credit */}
            <div className="bg-coal-2/80 border border-cream/10 rounded-xl p-5">
              <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-cream/45 uppercase mb-3">
                <Plus size={14} /> Dane jodo (manual)
              </p>
              <div className="flex gap-2">
                <input
                  value={creditAmt}
                  onChange={(e) => setCreditAmt(e.target.value.replace(/\D/g, ""))}
                  placeholder="Kitne dane?"
                  inputMode="numeric"
                  className={inputCls + " flex-1 tracking-normal"}
                />
                <button
                  onClick={() => void credit()}
                  disabled={busy || !creditAmt}
                  className="flex items-center gap-2 h-12 px-5 rounded-lg bg-leaf text-cream text-[13.5px] font-bold hover:brightness-110 disabled:opacity-40"
                >
                  <Plus size={16} /> Jodo
                </button>
              </div>
              <p className="text-[11.5px] font-semibold text-cream/40 mt-2.5">
                Goodwill, shikayat ka inaam, ya tyohaar bonus ke liye.
              </p>
            </div>
          </>
        )}

        {/* messages */}
        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-leaf/10 border border-leaf/40 rounded-xl px-4 py-3 flex items-center gap-2 text-leaf text-[13px] font-bold"
            >
              <CheckCircle2 size={16} /> {msg}
            </motion.div>
          )}
        </AnimatePresence>

        {!cust && (
          <div className="bg-coal-2/50 border border-dashed border-cream/15 rounded-xl p-6">
            <p className="text-[13px] font-semibold text-cream/40 leading-relaxed">
              Customer aaye aur bole <i className="text-cream/70">"free doodh chahiye mere dano se"</i> — uska
              phone daalo, balance dekho, aur ek tap mein inaam de do. Hisaab server pe pakka hota hai.
            </p>
            {achievable.length === 0 && cust === null && (
              <p className="font-hand text-xl text-led/60 mt-2">pehle khata kholo baayein taraf →</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
