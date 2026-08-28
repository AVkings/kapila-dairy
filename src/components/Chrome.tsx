/* ── Kapila Dairy · navbar · cursor · toasts · fly-layer · footer ──── */
import { useEffect, useState, type FormEvent } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useScroll,
  useMotionValueEvent,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ShoppingBag,
  Sparkles,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  LogOut,
  User,
} from "lucide-react";
import { useStore, type Fly } from "../lib/store";
import { scrollToId } from "../lib/scroll";
import { CATEGORIES } from "../lib/data";

/* ── logo ── */
function DiyaMark({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <path
        d="M24 4C24 4 9 21.5 9 30.5a15 15 0 0 0 30 0C39 21.5 24 4 24 4Z"
        fill="#FF9933"
      />
      <path
        d="M24 15c0 0-8.5 10-8.5 16a8.5 8.5 0 0 0 17 0C32.5 25 24 15 24 15Z"
        fill="#FFFEF0"
      />
      <circle cx="24" cy="32" r="3.4" fill="#E2670A" />
    </svg>
  );
}

function Logo() {
  const { nav, view } = useStore();
  return (
    <button
      onClick={() => {
        if (view.page !== "home") nav({ page: "home" });
        else scrollToId("#top");
      }}
      className="flex items-center gap-2.5 group"
      data-hover
    >
      <motion.span whileHover={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.5 }}>
        <DiyaMark />
      </motion.span>
      <span className="leading-none text-left">
        <span className="block font-display font-black text-[21px] tracking-tight text-espresso group-hover:text-saffron-deep transition-colors">
          Kapila
        </span>
        <span className="block text-[8.5px] font-bold tracking-[0.34em] text-saffron-deep mt-0.5">
          DAIRY · EST 1974
        </span>
      </span>
    </button>
  );
}

/* ── navbar ── */
const LINKS = [
  { label: "Mithai Ghar", target: "#menu" },
  { label: "Chaar Kone", target: "#categories" },
  { label: "Sakhar Dana", target: "#rewards" },
  { label: "Dhaaba", target: "#contact" },
];

export function Navbar() {
  const { cart, cartBump, cartOpen, setCartOpen, cartRef, customer, setLoginOpen, nav, view, logout, toast } =
    useStore();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 30));

  const count = cart.reduce((s, i) => s + i.qty, 0);

  const goSection = (target: string) => {
    setMenuOpen(false);
    if (view.page !== "home") {
      nav({ page: "home" });
      window.setTimeout(() => scrollToId(target), 520);
    } else {
      scrollToId(target);
    }
  };

  return (
    <>
      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.15 }}
        className={`fixed top-0 inset-x-0 z-[70] transition-all duration-500 ${
          scrolled
            ? "h-[60px] bg-cream/75 backdrop-blur-xl border-b border-espresso/10 shadow-[0_10px_36px_-22px_rgba(62,39,35,0.5)]"
            : "h-20 bg-transparent"
        }`}
      >
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
          <Logo />

          <nav className="hidden lg:flex items-center gap-1">
            {LINKS.map((l) => (
              <button
                key={l.target}
                onClick={() => goSection(l.target)}
                className="relative px-4 py-2 text-[13.5px] font-semibold tracking-wide text-espresso/80 hover:text-espresso group"
                data-hover
              >
                {l.label}
                <span className="absolute left-4 right-4 -bottom-0.5 h-[2.5px] rounded-full bg-saffron scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {customer ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => goSection("#rewards")}
                  className="hidden sm:flex items-center gap-1.5 rounded-full bg-espresso text-gold pl-3 pr-3.5 h-10 text-sm font-bold hover:bg-espresso-deep transition-colors"
                  data-hover
                  title="Sakhar ke dane"
                >
                  <Sparkles size={15} className="text-gold" />
                  {customer.points}
                  <span className="text-cream/55 font-medium text-[11px]">dane</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    toast("Phir milenge, " + customer.name.split(" ")[0] + " ji!", "ok");
                  }}
                  className="hidden md:grid w-10 h-10 place-items-center rounded-full border border-espresso/25 text-espresso/70 hover:bg-espresso hover:text-cream transition-colors"
                  data-hover
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="hidden sm:flex items-center gap-1.5 h-10 px-4 rounded-full border-[1.5px] border-espresso/30 text-sm font-semibold text-espresso hover:bg-espresso hover:text-cream transition-colors"
                data-hover
              >
                <User size={15} /> Login
              </button>
            )}

            {/* cart */}
            <motion.button
              ref={cartRef}
              onClick={() => setCartOpen(true)}
              whileTap={{ scale: 0.86 }}
              animate={cartBump > 0 ? { scale: [1, 1.28, 1] } : undefined}
              transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              className={`relative grid place-items-center w-11 h-11 rounded-full text-espresso transition-colors ${
                cartOpen ? "bg-saffron text-cream" : "bg-gold/60 hover:bg-gold"
              }`}
              data-hover
              aria-label="Cart kholo"
            >
              <ShoppingBag size={19} strokeWidth={2.2} />
              <motion.span
                key={cartBump}
                initial={{ scale: 0.3, y: 5 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 16 }}
                className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-saffron-deep text-cream text-[11px] font-bold grid place-items-center shadow-md ${
                  count === 0 ? "hidden" : ""
                }`}
              >
                {count}
              </motion.span>
            </motion.button>

            {/* hamburger */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden grid place-items-center w-11 h-11 rounded-full border-[1.5px] border-espresso/25"
              data-hover
              aria-label="Menu"
            >
              <span className="relative w-5 h-3.5">
                <motion.span
                  animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                  className="absolute top-0 left-0 w-full h-[2.2px] rounded-full bg-espresso block"
                />
                <motion.span
                  animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                  className="absolute bottom-0 left-0 w-full h-[2.2px] rounded-full bg-espresso block"
                />
              </span>
            </button>
          </div>
        </div>
      </motion.header>

      {/* mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            className="fixed inset-0 z-[75] lg:hidden bg-espresso-deep text-cream flex flex-col px-7 pt-24 pb-10"
          >
            <nav className="flex flex-col gap-1">
              {LINKS.map((l, i) => (
                <motion.button
                  key={l.target}
                  initial={{ x: 60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.08 + i * 0.07, type: "spring", stiffness: 220, damping: 22 }}
                  onClick={() => goSection(l.target)}
                  className="text-left font-display font-bold text-4xl py-2.5 border-b border-cream/10 hover:text-gold transition-colors"
                  data-hover
                >
                  {l.label}
                </motion.button>
              ))}
            </nav>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-auto flex items-center justify-between"
            >
              {customer ? (
                <div className="flex items-center gap-2 text-gold font-bold">
                  <Sparkles size={18} /> {customer.points} dane
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setLoginOpen(true);
                  }}
                  className="flex items-center gap-2 bg-saffron text-espresso-deep font-bold px-5 h-12 rounded-full"
                  data-hover
                >
                  Login karo <ArrowRight size={16} />
                </button>
              )}
              <a href="tel:+919876543210" className="text-cream/60 text-sm" data-hover>
                +91 98765 43210
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── fly-to-cart layer ── */
function FlyNode({ f }: { f: Fly }) {
  const { retireFly, cartRef } = useStore();
  const [to] = useState(() => {
    const el = cartRef.current;
    if (!el) return { x: window.innerWidth - 50, y: 40 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const midX = (f.from.x + to.x) / 2;
  return (
    <motion.img
      src={f.img}
      alt=""
      draggable={false}
      className="fixed z-[95] pointer-events-none rounded-full object-cover shadow-lift ring-2 ring-cream"
      style={{ width: 54, height: 54, left: -27, top: -27 }}
      initial={{ x: f.from.x, y: f.from.y, scale: 1, opacity: 1, rotate: 0 }}
      animate={{
        x: [f.from.x, midX, to.x],
        y: [f.from.y, f.from.y - 120, to.y],
        scale: [1, 0.9, 0.25],
        opacity: [1, 1, 0.7],
        rotate: [0, 40, 120],
      }}
      transition={{ duration: 0.78, ease: [0.45, 0, 0.25, 1], times: [0, 0.5, 1] }}
      onAnimationComplete={() => retireFly(f.id)}
    />
  );
}

export function FlyLayer() {
  const { flies } = useStore();
  return <>{flies.map((f) => <FlyNode key={f.id} f={f} />)}</>;
}

/* ── custom cursor ── */
export function CustomCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const dotX = useSpring(x, { stiffness: 600, damping: 36, mass: 0.5 });
  const dotY = useSpring(y, { stiffness: 600, damping: 36, mass: 0.5 });
  const ringX = useSpring(x, { stiffness: 220, damping: 22, mass: 0.7 });
  const ringY = useSpring(y, { stiffness: 220, damping: 22, mass: 0.7 });
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      setHover(!!t?.closest?.("a,button,[role=button],input,textarea,select,[data-hover]"));
    };
    const dn = () => setDown(true);
    const up = () => setDown(false);
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseover", over, { passive: true });
    window.addEventListener("mousedown", dn);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      window.removeEventListener("mousedown", dn);
      window.removeEventListener("mouseup", up);
    };
  }, [x, y]);

  return (
    <div className="custom-cursor-root pointer-events-none fixed inset-0 z-[99] hidden md:block" aria-hidden="true">
      <motion.div className="absolute" style={{ x: dotX, y: dotY, marginLeft: -5, marginTop: -5 }}>
        <motion.div
          animate={{ scale: down ? 0.55 : 1 }}
          className="w-2.5 h-2.5 rounded-full bg-cream mix-blend-difference shadow-[0_0_14px_3px_rgba(255,215,0,0.45)]"
        />
      </motion.div>
      <motion.div className="absolute" style={{ x: ringX, y: ringY, marginLeft: -19, marginTop: -19 }}>
        <motion.div
          animate={{ scale: hover ? 2.4 : 1, opacity: hover ? 0.95 : 0.5 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-[38px] h-[38px] rounded-full border-[1.5px] border-cream/90 mix-blend-difference bg-cream/5"
        />
      </motion.div>
    </div>
  );
}

/* ── toasts ── */
export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="fixed bottom-5 right-4 sm:right-6 z-[97] flex flex-col gap-2 items-end">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className={`flex items-center gap-2.5 max-w-[320px] px-4 py-3 rounded-2xl shadow-lift text-sm font-semibold border-l-4 ${
              t.tone === "ok"
                ? "bg-espresso text-cream border-saffron"
                : "bg-chili text-cream border-gold"
            }`}
          >
            {t.tone === "ok" ? <Sparkles size={16} className="text-gold shrink-0" /> : null}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── login modal ── */
export function LoginModal() {
  const { loginOpen, setLoginOpen, login, toast } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Naam toh batao ji — kam se kam 2 akshar.");
    if (!/^\d{10}$/.test(phone)) return setErr("Phone 10 digit ka hona chahiye.");
    const { credited, customer } = login(name.trim(), phone);
    setLoginOpen(false);
    setName("");
    setPhone("");
    setErr("");
    if (credited > 0) toast(`Welcome ${customer.name.split(" ")[0]}! +${credited} sakhar ke dane mile.`, "ok");
    else toast(`Namaste ${customer.name.split(" ")[0]} ji! Khata khul gaya.`, "ok");
  };

  return (
    <AnimatePresence>
      {loginOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLoginOpen(false)}
            className="fixed inset-0 z-[80] bg-espresso-deep/60 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[81] grid place-items-center p-4 pointer-events-none">
            <motion.form
              onSubmit={submit}
              initial={{ opacity: 0, scale: 0.85, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="pointer-events-auto w-full max-w-sm bg-cream rounded-[1.6rem] p-7 shadow-lift border border-gold/40 relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-saffron/20 blur-2xl" />
              <div className="flex items-center gap-3 mb-1">
                <DiyaMark className="w-10 h-10" />
                <h3 className="font-display font-black text-3xl">Dhaabe ka Khata</h3>
              </div>
              <p className="font-hand text-xl text-saffron-deep mb-5">
                sirf naam + phone — password ki koi jhanjhat nahi
              </p>
              <label className="block text-[11px] font-bold tracking-[0.18em] text-espresso/60 mb-1.5">
                NAAM
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Gupta"
                className="w-full h-12 px-4 rounded-xl border-[1.5px] border-espresso/20 bg-white/70 text-[15px] font-medium mb-4"
              />
              <label className="block text-[11px] font-bold tracking-[0.18em] text-espresso/60 mb-1.5">
                PHONE (10 digit)
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="98765 43210"
                inputMode="numeric"
                className="w-full h-12 px-4 rounded-xl border-[1.5px] border-espresso/20 bg-white/70 text-[15px] font-medium tracking-widest"
              />
              {err && <p className="text-chili text-xs font-semibold mt-2">{err}</p>}
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="submit"
                className="mt-5 w-full h-13 py-3.5 rounded-xl bg-espresso text-cream font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-saffron-deep transition-colors"
                data-hover
              >
                <Sparkles size={17} className="text-gold" /> Khata kholo — dane kamao
              </motion.button>
              <p className="text-[11px] text-espresso/50 text-center mt-3">
                Har ₹10 pe 1 sakhar ka dana · 100 dane pe free doodh
              </p>
            </motion.form>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── footer ── */
export function Footer() {
  const { setFilter, nav, view } = useStore();
  const goMenu = (cat: string) => {
    setFilter(cat as typeof CATEGORIES[number]["id"]);
    if (view.page !== "home") {
      nav({ page: "home" });
      window.setTimeout(() => scrollToId("#menu"), 520);
    } else scrollToId("#menu");
  };

  return (
    <footer id="contact" className="relative bg-espresso-deep text-cream overflow-hidden">
      <div className="absolute -top-7 left-0 right-0 h-7 bg-espresso-deep [clip-path:polygon(0_100%,100%_100%,100%_0,50%_100%,0_0)]" />
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-20 pb-10 relative">
        <div className="grid md:grid-cols-[1.4fr_1fr_1fr] gap-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <DiyaMark className="w-11 h-11" />
              <div>
                <p className="font-display font-black text-3xl leading-none">Kapila Dairy</p>
                <p className="font-hand text-xl text-gold mt-1">ghar jaisa swad, 1974 se</p>
              </div>
            </div>
            <p className="text-cream/65 text-sm leading-relaxed max-w-sm">
              Teen peedhi ka dhaaba. Subah 4 baje ki mathai, 6 baje ki pehli malai, aur halwai ke
              haath ki mithai — sab kuch waise hi, jaise Dadaji ne shuru kiya tha.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["A2 Doodh", "Bilona Ghee", "Halwai Mithai", "Matki Lassi"].map((b) => (
                <span
                  key={b}
                  className="px-3 py-1.5 rounded-full border border-cream/20 text-xs font-semibold text-cream/75"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold tracking-[0.28em] text-gold mb-4">DHAABE KA PATA</p>
            <ul className="space-y-3.5 text-sm text-cream/75">
              <li className="flex gap-3">
                <MapPin size={17} className="text-saffron shrink-0 mt-0.5" />
                <span>
                  14, Doodh Mandi Road,
                  <br /> Purana Bazaar, Shahar — 282001
                </span>
              </li>
              <li className="flex gap-3">
                <Clock size={17} className="text-saffron shrink-0 mt-0.5" />
                <span>
                  Roz subah <b className="text-cream">6:00</b> se raat <b className="text-cream">9:30</b> tak
                  <br />
                  <span className="text-cream/50 text-xs">Tyohaar pe raat 11 baje tak</span>
                </span>
              </li>
              <li className="flex gap-3">
                <Phone size={17} className="text-saffron shrink-0 mt-0.5" />
                <a href="tel:+919876543210" className="hover:text-gold transition-colors" data-hover>
                  +91 98765 43210
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold tracking-[0.28em] text-gold mb-4">JALDI JAO</p>
            <ul className="space-y-2.5 text-sm">
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => goMenu(c.id)}
                    className="text-cream/75 hover:text-gold hover:translate-x-1 inline-block transition-all font-medium"
                    data-hover
                  >
                    {c.name} <span className="text-cream/35 text-xs">· {c.hindi}</span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => scrollToId("#rewards")}
                  className="text-cream/75 hover:text-gold hover:translate-x-1 inline-block transition-all font-medium"
                  data-hover
                >
                  Sakhar ke Dane <span className="text-cream/35 text-xs">· rewards</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-cream/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-cream/45">
          <p>© 2026 Kapila Dairy · Sab swad surakshit, sab dil khush.</p>
          <p className="font-hand text-lg text-cream/60">admin counter panel — jald aa raha hai</p>
        </div>
      </div>
      <p
        aria-hidden="true"
        className="font-display font-black text-[19vw] leading-[0.72] text-center text-stroke-cream opacity-[0.07] select-none pointer-events-none -mb-[4vw]"
      >
        KAPILA
      </p>
    </footer>
  );
}
