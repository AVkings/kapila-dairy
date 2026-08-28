/* ── Kapila Dairy · global store (cart · loyalty · views · toasts) ── */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, Category, Customer, Order, Product } from "./data";
import { fetchProducts, upsertCustomerRemote } from "./supabase";

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
  customer: "kapila_customer_v1",
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
    /* storage full/blocked — in-memory still works */
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
  cartRef: React.MutableRefObject<HTMLButtonElement | null>;

  flies: Fly[];
  retireFly: (id: number) => void;

  customer: Customer | null;
  loginOpen: boolean;
  setLoginOpen: (b: boolean) => void;
  login: (name: string, phone: string) => { credited: number; customer: Customer };
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
  const [customer, setCustomer] = useState<Customer | null>(() => load(LS.customer, null));
  const [loginOpen, setLoginOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  /* catalogue — Supabase first, local fallback */
  useEffect(() => {
    let alive = true;
    fetchProducts().then((p) => {
      if (!alive) return;
      setProducts(p);
      setProductsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => persist(LS.cart, cart), [cart]);

  const nav = useCallback((v: View) => {
    setCartOpen(false);
    setLoginOpen(false);
    setView(v);
  }, []);

  const toast = useCallback((msg: string, tone: "ok" | "warn" = "ok") => {
    const id = uid++;
    setToasts((t) => [...t.slice(-3), { id, msg, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
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

  const login = useCallback(
    (name: string, phone: string) => {
      const existing = load<Customer | null>(LS.customer, null);
      const pending = load<{ grains: number; orderId: string } | null>(LS.pending, null);
      const base = existing && existing.phone === phone ? existing.points : 0;
      const credited = pending ? pending.grains : 0;
      const c: Customer = {
        name,
        phone,
        points: base + credited,
        joinedAt: existing?.joinedAt ?? new Date().toISOString(),
      };
      setCustomer(c);
      persist(LS.customer, c);
      if (pending) {
        localStorage.removeItem(LS.pending);
      }
      void upsertCustomerRemote(c);
      return { credited, customer: c };
    },
    []
  );

  const logout = useCallback(() => {
    setCustomer(null);
    localStorage.removeItem(LS.customer);
  }, []);

  const placeOrder = useCallback(
    (o: Order) => {
      if (customer) {
        const c: Customer = { ...customer, points: customer.points + o.grainsEarned };
        setCustomer(c);
        persist(LS.customer, c);
        void upsertCustomerRemote(c);
      } else if (o.grainsEarned > 0) {
        persist(LS.pending, { grains: o.grainsEarned, orderId: o.id });
      }
    },
    [customer]
  );

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
    flies,
    retireFly,
    customer,
    loginOpen,
    setLoginOpen,
    login,
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
