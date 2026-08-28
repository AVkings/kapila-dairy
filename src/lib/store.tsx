/* ── Kapila Dairy · global store (cart · auth · loyalty · views) ───── */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { CartItem, Category, Customer, Order, Product } from "./data";
import {
  creditDaneRemote,
  ensureProfileName,
  fetchProducts,
  getSessionCustomer,
  pingSupabase,
  saveOrderRemote,
  signOutUser,
  supabase,
  type CatalogSource,
} from "./supabase";

export type View =
  | { page: "home" }
  | { page: "product"; id: string }
  | { page: "checkout" }
  | { page: "success"; order: Order };

export interface Fly {
  id: number;
  img: string;
  from: { x: number; y: number };
}

export interface Toast {
  id: number;
  msg: string;
  tone: "ok" | "warn";
}

const LS = {
  cart: "kapila_cart_v1",
  customer: "kapila_customer_v2",
  pending: "kapila_pending_v1",
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked — in-memory still works */
  }
}

interface StoreShape {
  view: View;
  nav: (v: View) => void;

  products: Product[];
  productsLoading: boolean;
  filter: "all" | Category;
  setFilter: (f: "all" | Category) => void;

  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "key">, sourceEl?: HTMLElement | null) => void;
  setQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;

  cartOpen: boolean;
  setCartOpen: (b: boolean) => void;
  cartBump: number;
  cartRef: MutableRefObject<HTMLButtonElement | null>;

  /** where the catalogue is coming from right now */
  dbSource: CatalogSource;

  flies: Fly[];
  retireFly: (id: number) => void;

  customer: Customer | null;
  sessionBooting: boolean;
  loginOpen: boolean;
  setLoginOpen: (b: boolean) => void;
  /** called after a successful Supabase auth — credits pending dane, returns credited */
  onAuthedCustomer: (c: Customer) => number;
  /** update the logged-in customer (e.g. after a dane redemption) */
  patchCustomer: (patch: Partial<Customer>) => void;
  logout: () => void;

  placeOrder: (o: Order) => void;

  toasts: Toast[];
  toast: (msg: string, tone?: "ok" | "warn") => void;
}

const StoreCtx = createContext<StoreShape | null>(null);

let uid = 1;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>({ page: "home" });
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Category>("all");

  const [cart, setCart] = useState<CartItem[]>(() => load(LS.cart, [] as CartItem[]));
  const [cartOpen, setCartOpen] = useState(false);
  const [cartBump, setCartBump] = useState(0);
  const cartRef = useRef<HTMLButtonElement | null>(null);

  const [flies, setFlies] = useState<Fly[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sessionBooting, setSessionBooting] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dbSource, setDbSource] = useState<CatalogSource>("local");

  const toast = useCallback((msg: string, tone: "ok" | "warn" = "ok") => {
    const id = uid++;
    setToasts((t) => [...t.slice(-3), { id, msg, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  /* catalogue — Supabase first, offline fallback */
  useEffect(() => {
    let alive = true;
    fetchProducts().then((p) => {
      if (!alive) return;
      setProducts(p);
      setProductsLoading(false);
    });
    pingSupabase().then((s) => {
      if (alive) setDbSource(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => persist(LS.cart, cart), [cart]);

  /* restore Supabase session → profile (or cached copy) */
  useEffect(() => {
    let alive = true;
    (async () => {
      const remote = await getSessionCustomer();
      if (!alive) return;
      if (remote) {
        setCustomer(remote);
        persist(LS.customer, remote);
      } else {
        const cached = load<Customer | null>(LS.customer, null);
        if (cached && !cached.authed) setCustomer(cached); // local khata (offline)
      }
      setSessionBooting(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* cross-tab auth changes */
  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setCustomer(null);
        localStorage.removeItem(LS.customer);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const nav = useCallback((v: View) => {
    setCartOpen(false);
    setLoginOpen(false);
    setView(v);
  }, []);

  const addToCart = useCallback(
    (item: Omit<CartItem, "key">, sourceEl?: HTMLElement | null) => {
      const key = `${item.productId}__${item.unit.label}`;
      setCart((c) => {
        const hit = c.find((i) => i.key === key);
        if (hit) return c.map((i) => (i.key === key ? { ...i, qty: i.qty + item.qty } : i));
        return [...c, { ...item, key }];
      });
      if (sourceEl) {
        const r = sourceEl.getBoundingClientRect();
        setFlies((f) => [
          ...f,
          {
            id: uid++,
            img: item.image,
            from: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
          },
        ]);
      } else {
        setCartBump((b) => b + 1);
      }
    },
    []
  );

  const setQty = useCallback((key: string, qty: number) => {
    setCart((c) =>
      qty <= 0 ? c.filter((i) => i.key !== key) : c.map((i) => (i.key === key ? { ...i, qty } : i))
    );
  }, []);

  const removeItem = useCallback((key: string) => setCart((c) => c.filter((i) => i.key !== key)), []);
  const clearCart = useCallback(() => setCart([]), []);

  const retireFly = useCallback((id: number) => {
    setFlies((f) => f.filter((x) => x.id !== id));
    setCartBump((b) => b + 1);
  }, []);

  /* login complete → credit any pending guest dane */
  const onAuthedCustomer = useCallback((c: Customer): number => {
    const pending = load<{ grains: number } | null>(LS.pending, null);
    const credited = pending?.grains ?? 0;
    let finalC = c;
    if (credited > 0) {
      finalC = { ...c, dane: c.dane + credited };
      localStorage.removeItem(LS.pending);
      void creditDaneRemote(credited); // server-side safe increment
    }
    setCustomer(finalC);
    persist(LS.customer, finalC);
    return credited;
  }, []);

  const patchCustomer = useCallback((patch: Partial<Customer>) => {
    setCustomer((c) => {
      if (!c) return c;
      const next = { ...c, ...patch };
      persist(LS.customer, next);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    void signOutUser();
    setCustomer(null);
    localStorage.removeItem(LS.customer);
  }, []);

  /* order complete → credit dane (server RPC when authed, pending otherwise) */
  const placeOrder = useCallback(
    (o: Order) => {
      void saveOrderRemote(o, customer?.authed ? customer.id : null);
      if (o.grainsEarned <= 0) return;
      if (customer) {
        const next: Customer = { ...customer, dane: customer.dane + o.grainsEarned };
        setCustomer(next);
        persist(LS.customer, next);
        if (customer.authed) {
          void creditDaneRemote(o.grainsEarned).then((serverTotal) => {
            if (serverTotal != null) setCustomer((c) => (c ? { ...c, dane: serverTotal } : c));
          });
        }
      } else {
        const pending = load<{ grains: number } | null>(LS.pending, null);
        persist(LS.pending, { grains: (pending?.grains ?? 0) + o.grainsEarned });
      }
    },
    [customer]
  );

  /* keep the name the customer typed in sync with the profile */
  useEffect(() => {
    if (customer?.authed && customer.name && customer.name !== "Kapila Guest") {
      void ensureProfileName(customer.id, customer.name);
    }
  }, [customer]);

  const value: StoreShape = {
    view,
    nav,
    products,
    productsLoading,
    filter,
    setFilter,
    cart,
    addToCart,
    setQty,
    removeItem,
    clearCart,
    cartOpen,
    setCartOpen,
    cartBump,
    cartRef,
    dbSource,
    flies,
    retireFly,
    customer,
    sessionBooting,
    loginOpen,
    setLoginOpen,
    onAuthedCustomer,
    patchCustomer,
    logout,
    placeOrder,
    toasts,
    toast,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreShape {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
