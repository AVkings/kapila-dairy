/* ── Kapila Counter · scan ticket → collect payment (Razorpay link) ── */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Html5Qrcode } from "html5-qrcode";
import QRCode from "react-qr-code";
import confetti from "canvas-confetti";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Banknote,
  QrCode,
  Search,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { markPaid, setOrderStatus, SHOP_NAME } from "../lib/admin";
import { getPayOrder } from "../lib/supabase";
import { inr } from "../lib/data";

interface TicketItem {
  item: string;
  qty: number;
  pack: string;
  amt: number;
}
interface Ticket {
  shop?: string;
  order: string;
  at: string;
  name: string;
  phone: string;
  pay: string;
  payId?: string | null;
  total: number;
  pickup?: string;
  redeem?: { reward: string; daneSpent: number } | null;
  items: TicketItem[];
}

const SCANNER_ID = "kapila-qr-region";

/** the exact-amount Razorpay pay page customers open after scanning */
const payUrl = (orderId: string) =>
  `${window.location.origin}${window.location.pathname}#/pay/${orderId}`;

export function AdminScan() {
  const [scanning, setScanning] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [paid, setPaid] = useState(false);
  const [collected, setCollected] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const [manualId, setManualId] = useState("");
  const [looking, setLooking] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [camErr, setCamErr] = useState("");
  const [copied, setCopied] = useState(false);

  const stopScanner = async () => {
    const s = scannerRef.current;
    if (s) {
      try {
        if (s.isScanning) await s.stop();
        s.clear();
      } catch {
        /* ignore */
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };
  useEffect(() => () => void stopScanner(), []);

  const accept = (raw: string) => {
    try {
      const t = JSON.parse(raw) as Ticket;
      if (!t || !t.order || !Array.isArray(t.items)) throw new Error("not a ticket");
      const alreadyPaid = t.pay === "ONLINE-PAID" || t.pay === "DANE-REDEEM-FREE";
      setTicket(t);
      setPaid(alreadyPaid);
      setCollected(false);
      /* unpaid ticket → Razorpay QR turant kholo */
      setShowLink(!alreadyPaid && !t.redeem);
      setJustPaid(false);
      setErr("");
      void stopScanner();
    } catch {
      setErr("Yeh Kapila ka ticket nahi lagta — dobara scan karo.");
    }
  };

  const startScanner = async () => {
    setErr("");
    setCamErr("");
    setScanning(true);
    try {
      const s = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = s;
      await s.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (text) => accept(text),
        () => undefined
      );
    } catch {
      setCamErr("Camera nahi khula — permission do, ya neeche order ID daalo.");
      setScanning(false);
    }
  };

  /* ── LIVE POLL: notify the moment the customer pays online ── */
  useEffect(() => {
    if (!ticket || paid) return;
    const iv = window.setInterval(async () => {
      const o = await getPayOrder(ticket.order);
      if (o && o.paid) {
        setPaid(true);
        setJustPaid(true);
        setShowLink(false);
        confetti({
          particleCount: 110,
          spread: 90,
          startVelocity: 42,
          origin: { x: 0.5, y: 0.4 },
          colors: ["#FF9933", "#FFD700", "#FFC24B", "#2F7D3B"],
          zIndex: 96,
        });
      }
    }, 2500);
    return () => window.clearInterval(iv);
  }, [ticket, paid]);

  const collectCash = async () => {
    if (!ticket) return;
    setBusy(true);
    const res = await markPaid(ticket.order, null);
    setBusy(false);
    if (res.error) return setErr("Update nahi hua: " + res.error);
    setPaid(true);
    setJustPaid(true);
  };

  const handOver = async () => {
    if (!ticket) return;
    setBusy(true);
    const res = await setOrderStatus(ticket.order, "collected");
    setBusy(false);
    if (res.error) return setErr("Update nahi hua: " + res.error);
    setCollected(true);
  };

  /* manual lookup by order ID */
  const lookup = async () => {
    const id = manualId.trim().toUpperCase();
    if (!id) return setErr("Order ID likho pehle — jaise KD-XXXX.");
    setErr("");
    setLooking(true);
    const o = await getPayOrder(id);
    setLooking(false);
    if (!o) return setErr(`Order "${id}" nahi mila — ID check karo.`);
    setTicket({
      order: o.order_id,
      at: new Date().toISOString(),
      name: o.customer_name,
      phone: o.phone,
      pay: o.redeem ? "DANE-REDEEM-FREE" : o.paid ? "ONLINE-PAID" : "PAY-AT-COUNTER",
      total: o.total,
      pickup: o.pickup ?? undefined,
      redeem: o.redeem,
      items: o.items.map((i) => ({ item: i.name, qty: i.qty, pack: i.pack, amt: i.price * i.qty })),
    });
    setPaid(o.paid || !!o.redeem);
    setCollected(o.status === "collected");
    /* unpaid → Razorpay QR turant kholo */
    setShowLink(!o.paid && !o.redeem);
    setJustPaid(false);
  };

  const copyLink = async () => {
    if (!ticket) return;
    try {
      await navigator.clipboard.writeText(payUrl(ticket.order));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr("Copy nahi hua — link manually select karo.");
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-5 items-start">
      {/* left: scanner + manual */}
      <div className="space-y-4">
        <div className="bg-coal-2/80 border border-cream/10 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display font-black text-2xl">
                Ticket <span className="text-led">scan</span> karo
              </h1>
              <p className="text-[12.5px] font-semibold text-cream/45 mt-1">
                Customer ka QR dikhao — pura hisaab khul jayega.
              </p>
            </div>
            <button
              onClick={() => (scanning ? void stopScanner() : void startScanner())}
              className={`flex items-center gap-2 h-11 px-4 rounded-lg text-[13px] font-bold transition-colors ${
                scanning
                  ? "bg-chili/20 border border-chili/50 text-chili"
                  : "bg-led text-coal hover:bg-gold"
              }`}
            >
              {scanning ? <CameraOff size={16} /> : <Camera size={16} />}
              {scanning ? "Band karo" : "Camera on"}
            </button>
          </div>

          {/* scanner region */}
          <div className="relative rounded-xl overflow-hidden bg-coal border border-cream/10">
            <div id={SCANNER_ID} className="w-full" />
            {!scanning && (
              <div className="absolute inset-0 grid place-items-center min-h-[220px]">
                <div className="text-center px-6">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="mx-auto w-16 h-16 grid place-items-center rounded-2xl bg-coal-3 border border-cream/15"
                  >
                    <QrCode size={28} className="text-led" />
                  </motion.div>
                  <p className="text-[13px] font-semibold text-cream/45 mt-3">
                    "Camera on" dabao aur QR saamne rakho
                  </p>
                  {camErr && <p className="text-chili text-[12px] font-bold mt-2">{camErr}</p>}
                </div>
              </div>
            )}
            {scanning && (
              <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden pointer-events-none">
                <motion.div
                  className="h-full w-1/3 bg-led shadow-[0_0_18px_2px_rgba(255,194,75,0.8)]"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* manual lookup */}
        <div className="bg-coal-2/80 border border-cream/10 rounded-xl p-5">
          <p className="text-[11px] font-bold tracking-[0.2em] text-cream/45 uppercase mb-3">
            Ya order ID daalo
          </p>
          <div className="flex gap-2">
            <input
              value={manualId}
              onChange={(e) => setManualId(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && void lookup()}
              placeholder="KD-XXXX"
              className="led flex-1 h-11 px-4 rounded-lg bg-coal-3 border border-cream/12 text-cream placeholder:text-cream/25 focus:border-led text-[14px]"
            />
            <button
              onClick={() => void lookup()}
              disabled={looking}
              className="flex items-center gap-2 h-11 px-4 rounded-lg bg-coal-3 border border-cream/15 text-[13px] font-bold text-cream/70 hover:text-led hover:border-led transition-colors disabled:opacity-50"
            >
              <Search size={15} /> {looking ? "Dhundh rahe…" : "Dhundo"}
            </button>
          </div>
          {err && <p className="text-chili text-[12.5px] font-bold mt-3">{err}</p>}
        </div>
      </div>

      {/* right: ticket */}
      <div>
        <AnimatePresence mode="wait">
          {!ticket ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-coal-2/50 border border-dashed border-cream/15 rounded-xl min-h-[380px] grid place-items-center"
            >
              <div className="text-center px-6">
                <p className="font-display font-bold text-xl text-cream/50">Ticket yahan khulega</p>
                <p className="font-hand text-2xl text-led/70 mt-1">scan karo, hisaab dekho, paisa lo</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={ticket.order}
              initial={{ opacity: 0, y: 24, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="bg-cream text-espresso rounded-xl shadow-lift overflow-hidden ticket-notch relative"
            >
              {/* live payment alert */}
              <AnimatePresence>
                {justPaid && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden bg-leaf text-cream"
                  >
                    <div className="px-5 py-3 flex items-center gap-3">
                      <motion.span
                        animate={{ scale: [1, 1.25, 1] }}
                        transition={{ duration: 0.8, repeat: 2 }}
                      >
                        <Sparkles size={20} className="text-gold" />
                      </motion.span>
                      <div>
                        <p className="font-display font-black text-[15px] leading-none">
                          PAYMENT AAYA — {inr(ticket.total)} ONLINE!
                        </p>
                        <p className="text-[11.5px] font-semibold text-cream/80 mt-0.5">
                          Razorpay se pakka paisa · thaila de do
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* header */}
              <div className="bg-espresso-deep text-cream px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-display font-black text-lg leading-none">{SHOP_NAME}</p>
                  <p className="led text-[10px] tracking-[0.25em] text-gold uppercase mt-1">counter ticket</p>
                </div>
                <div className="text-right">
                  <p className="led text-[13px] font-bold text-gold">{ticket.order}</p>
                  <p className="text-[10.5px] font-semibold text-cream/50">
                    {new Date(ticket.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              {/* body */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-display font-bold text-lg leading-tight">{ticket.name}</p>
                    <p className="led text-[12px] text-espresso/60">{ticket.phone}</p>
                  </div>
                  <span className="text-[11px] font-bold bg-sand px-3 py-1.5 rounded-full">
                    Pickup: {ticket.pickup || "—"}
                  </span>
                </div>

                <ul className="divide-y divide-espresso/10 border-y border-dashed border-espresso/25 my-3">
                  {ticket.items.map((it, i) => (
                    <li key={i} className="flex items-center gap-3 py-2.5">
                      <span className="led text-[13px] font-bold w-8 text-saffron-deep">×{it.qty}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold truncate">{it.item}</p>
                        <p className="text-[11px] font-semibold text-espresso/55">{it.pack}</p>
                      </div>
                      <span className="led text-[14px] font-bold">{inr(it.amt)}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold tracking-wider text-espresso/55">KUL JOD</span>
                  <span className="font-display font-black text-3xl">
                    {ticket.redeem ? <span className="text-leaf">FREE</span> : inr(ticket.total)}
                  </span>
                </div>

                {/* stamps */}
                <div className="flex flex-wrap gap-3 mt-4 min-h-[34px] items-center">
                  {ticket.redeem && (
                    <span className="stamp text-leaf flex items-center gap-1.5">
                      <Sparkles size={13} /> Dane se free · {ticket.redeem.daneSpent} dane
                    </span>
                  )}
                  {paid && !ticket.redeem && (
                    <span className="stamp text-leaf">
                      PAID · {justPaid || ticket.pay === "ONLINE-PAID" ? "RAZORPAY ONLINE" : ticket.pay}
                    </span>
                  )}
                  {!paid && <span className="stamp text-gold">PAY AT COUNTER</span>}
                  {collected && <span className="stamp text-saffron-deep">THAILA DIYA</span>}
                </div>
              </div>

              {/* actions */}
              <div className="bg-parchment/70 border-t border-dashed border-espresso/25 px-5 py-4 flex flex-wrap gap-2.5">
                {!paid && !ticket.redeem && (
                  <>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => void collectCash()}
                      disabled={busy}
                      className="flex items-center gap-2 h-11 px-5 rounded-lg bg-leaf text-cream text-[13.5px] font-bold hover:brightness-110 disabled:opacity-60"
                    >
                      <Banknote size={16} /> {busy ? "…" : "Cash liya — PAID"}
                    </motion.button>
                    <button
                      onClick={() => setShowLink((v) => !v)}
                      className={`flex items-center gap-2 h-11 px-5 rounded-lg text-[13.5px] font-bold transition-colors ${
                        showLink
                          ? "bg-led text-coal"
                          : "bg-espresso text-cream hover:bg-espresso-deep"
                      }`}
                    >
                      <QrCode size={16} /> Razorpay QR dikhao
                    </button>
                  </>
                )}
                {paid && !collected && (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => void handOver()}
                    disabled={busy}
                    className="flex items-center gap-2 h-11 px-5 rounded-lg bg-saffron-deep text-cream text-[13.5px] font-bold hover:brightness-110 disabled:opacity-60"
                  >
                    <CheckCircle2 size={16} /> {busy ? "…" : "Thaila de diya — COLLECTED"}
                  </motion.button>
                )}
                {collected && (
                  <p className="text-[13px] font-bold text-leaf flex items-center gap-2">
                    <CheckCircle2 size={16} /> Order pura hua. Agla customer!
                  </p>
                )}
              </div>

              {/* Razorpay exact-amount QR */}
              <AnimatePresence>
                {showLink && !paid && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-espresso-deep"
                  >
                    <div className="px-5 py-5 flex items-center gap-5">
                      <div className="bg-cream p-3 rounded-xl shrink-0 relative">
                        <QRCode value={payUrl(ticket.order)} size={132} fgColor="#241410" bgColor="#FFFFFF" level="M" />
                        <span className="absolute -top-2 -right-2 grid place-items-center w-7 h-7 rounded-full bg-saffron text-espresso-deep">
                          <Smartphone size={14} />
                        </span>
                      </div>
                      <div className="text-cream">
                        <p className="font-display font-bold text-lg leading-tight">Customer se scan karwao</p>
                        <p className="led text-[12px] text-gold mt-1">
                          {inr(ticket.total)} · exact amount · Razorpay
                        </p>
                        <p className="text-[11.5px] font-semibold text-cream/55 mt-1.5 leading-relaxed">
                          Pay hote hi <b className="text-led">yahan apne aap notification</b> aayegi —
                          kuch dabana nahi padega.
                        </p>
                        <span className="inline-flex items-center gap-1.5 mt-2 text-[10.5px] font-bold text-led">
                          <span className="relative flex w-2 h-2">
                            <span className="absolute inline-flex w-full h-full rounded-full bg-led opacity-60 animate-ping" />
                            <span className="relative inline-flex w-2 h-2 rounded-full bg-led" />
                          </span>
                          PAYMENT KA INTEZAAR…
                        </span>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => void copyLink()}
                            className={`h-9 px-3.5 rounded-lg text-[11.5px] font-bold transition-colors ${
                              copied
                                ? "bg-leaf text-cream"
                                : "bg-cream/10 border border-cream/20 text-cream/85 hover:border-led hover:text-led"
                            }`}
                          >
                            {copied ? "Link copy ho gaya!" : "Link copy karo (WhatsApp pe bhejo)"}
                          </button>
                          <span className="text-[10px] font-bold text-cream/35">
                            test mode: success@razorpay se pay karke dekho
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
