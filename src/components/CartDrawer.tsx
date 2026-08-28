/* ── Kapila Dairy · spring-physics cart drawer ─────────────────────── */
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Minus, Plus, ShoppingBag, Sparkles, Trash2, X } from "lucide-react";
import { useStore } from "../lib/store";
import { cartTotal, grainsFrom, inr, type CartItem } from "../lib/data";
import { scrollToId } from "../lib/scroll";

function Row({ item }: { item: CartItem }) {
  const { setQty, removeItem } = useStore();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -230, transition: { duration: 0.28 } }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.55}
      onDragEnd={(_, info) => {
        if (info.offset.x < -90) removeItem(item.key);
      }}
      className="group relative flex items-center gap-3 bg-white/75 border border-espresso/10 rounded-2xl p-2.5 pr-3 shadow-sm"
    >
      {/* swipe hint */}
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-chili/60 text-[10px] font-bold tracking-widest opacity-0 group-hover:opacity-60 transition-opacity select-none">
        ←
      </span>
      <img
        src={item.image}
        alt={item.name}
        draggable={false}
        className="w-[58px] h-[58px] rounded-xl object-cover shrink-0 ring-1 ring-espresso/10"
      />
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-[15px] text-espresso truncate">{item.name}</p>
        <p className="text-[11.5px] font-semibold text-espresso/55">{item.unit.label} · {inr(item.unit.price)}</p>
        <div className="mt-1.5 inline-flex items-center gap-1 bg-cream border border-espresso/15 rounded-full p-0.5">
          <button
            onClick={() => setQty(item.key, item.qty - 1)}
            className="w-7 h-7 grid place-items-center rounded-full hover:bg-saffron hover:text-cream transition-colors"
            data-hover
            aria-label="Kam karo"
          >
            <Minus size={13} strokeWidth={3} />
          </button>
          <motion.span
            key={item.qty}
            initial={{ scale: 0.5, y: 4 }}
            animate={{ scale: 1, y: 0 }}
            className="w-6 text-center text-sm font-black text-espresso"
          >
            {item.qty}
          </motion.span>
          <button
            onClick={() => setQty(item.key, item.qty + 1)}
            className="w-7 h-7 grid place-items-center rounded-full hover:bg-saffron hover:text-cream transition-colors"
            data-hover
            aria-label="Badhao"
          >
            <Plus size={13} strokeWidth={3} />
          </button>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="font-display font-black text-[16px] text-espresso">
          {inr(item.unit.price * item.qty)}
        </span>
        <button
          onClick={() => removeItem(item.key)}
          className="text-espresso/35 hover:text-chili transition-colors"
          data-hover
          aria-label="Hatao"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </motion.div>
  );
}

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, nav, customer, setLoginOpen } = useStore();
  const total = cartTotal(cart);
  const grains = grainsFrom(total);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 z-[84] bg-espresso-deep/55 backdrop-blur-[3px]"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[432px] z-[85] bg-cream border-l border-gold/50 shadow-2xl flex flex-col"
          >
            {/* header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-espresso/10">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-11 h-11 rounded-full bg-saffron text-espresso-deep">
                  <ShoppingBag size={20} strokeWidth={2.3} />
                </span>
                <div>
                  <h2 className="font-display font-black text-2xl leading-none">Aapka Thela</h2>
                  <p className="text-[11.5px] font-semibold text-espresso/55 mt-0.5">
                    {count} cheez{count === 1 ? "" : "ein"} · swipe ← karke hatao
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="w-10 h-10 grid place-items-center rounded-full border border-espresso/20 hover:bg-espresso hover:text-cream transition-colors"
                data-hover
                aria-label="Band karo"
              >
                <X size={18} />
              </button>
            </div>

            {/* items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <AnimatePresence mode="popLayout">
                {cart.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center px-6"
                  >
                    <motion.span
                      animate={{ rotate: [0, -6, 6, 0] }}
                      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                      className="grid place-items-center w-24 h-24 rounded-full bg-sand/70 border-2 border-dashed border-espresso/25 mb-5"
                    >
                      <ShoppingBag size={36} className="text-espresso/40" />
                    </motion.span>
                    <p className="font-display font-black text-2xl">Thela khaali hai ji!</p>
                    <p className="font-hand text-2xl text-saffron-deep mt-1">kuch meetha toh banta hai…</p>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setCartOpen(false);
                        scrollToId("#menu");
                      }}
                      className="mt-6 bg-espresso text-cream font-bold px-7 h-12 rounded-full hover:bg-saffron-deep transition-colors"
                      data-hover
                    >
                      Menu dekho
                    </motion.button>
                  </motion.div>
                ) : (
                  cart.map((item) => <Row key={item.key} item={item} />)
                )}
              </AnimatePresence>
            </div>

            {/* footer */}
            {cart.length > 0 && (
              <div className="border-t border-espresso/10 px-6 pt-4 pb-6 bg-parchment/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-espresso/60 tracking-wide">KUL JOD</span>
                  <motion.span
                    key={total}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="font-display font-black text-3xl text-espresso"
                  >
                    {inr(total)}
                  </motion.span>
                </div>
                <div className="flex items-center gap-2.5 bg-gold/25 border border-gold-deep/30 rounded-xl px-3.5 py-2.5 mb-4">
                  <Sparkles size={16} className="text-gold-deep shrink-0" />
                  {customer ? (
                    <p className="text-[12.5px] font-semibold text-espresso/80">
                      Is order pe <b className="text-saffron-deep">+{grains} sakhar ke dane</b> milenge!
                    </p>
                  ) : (
                    <button
                      onClick={() => setLoginOpen(true)}
                      className="text-left text-[12.5px] font-semibold text-espresso/80 hover:text-saffron-deep transition-colors underline decoration-dotted underline-offset-2"
                      data-hover
                    >
                      Login karo aur <b className="text-saffron-deep">+{grains} dane</b> kamao
                    </button>
                  )}
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => nav({ page: "checkout" })}
                  className="w-full h-14 rounded-2xl bg-saffron-deep text-cream font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-espresso transition-colors shadow-lift"
                  data-hover
                >
                  Checkout karo <ArrowRight size={18} strokeWidth={2.6} />
                </motion.button>
                <p className="text-center text-[11px] text-espresso/50 font-medium mt-2.5">
                  Payment online (Razorpay) ya counter pe — dono chalega
                </p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
