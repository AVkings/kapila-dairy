/* ── Kapila Dairy · Admin Counter Terminal · auth + RPC ─────────────
   Demo-grade: admin creds live in the client bundle (VITE_ADMIN_*).
   When the counter gets its own backend, move auth server-side and
   swap these anon-key RPCs for service-role calls.                 */
import { supabase } from "./supabase";
import type { Product, UnitOption } from "./data";

const ADMIN_USER = (import.meta.env.VITE_ADMIN_USER as string) || "admin@kapila";
const ADMIN_PASS = (import.meta.env.VITE_ADMIN_PASS as string) || "";

export const UPI_ID = (import.meta.env.VITE_UPI_ID as string) || "kapiladairy@upi";
export const SHOP_NAME = (import.meta.env.VITE_SHOP_NAME as string) || "Kapila Dairy";

const LOCK_KEY = "kapila_admin_lock_v1";
const SESSION_KEY = "kapila_admin_session_v1";
export const MAX_ATTEMPTS = 3;
export const LOCK_MINUTES = 15;
const SESSION_HOURS = 12;

interface LockState {
  count: number;
  lockedUntil: number | null;
}

function readLock(): LockState {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw) return JSON.parse(raw) as LockState;
  } catch {
    /* ignore */
  }
  return { count: 0, lockedUntil: null };
}
function writeLock(s: LockState) {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function lockRemainingMs(): number {
  const s = readLock();
  if (!s.lockedUntil) return 0;
  return Math.max(0, s.lockedUntil - Date.now());
}

export type LoginResult =
  | { ok: true }
  | { ok: false; lockedMs?: number; attemptsLeft?: number };

/** Returns ok, or a lock duration / remaining attempts. Enforces 3 tries → 15 min lock. */
export function attemptLogin(user: string, pass: string): LoginResult {
  const remaining = lockRemainingMs();
  if (remaining > 0) return { ok: false, lockedMs: remaining };

  if (user.trim().toLowerCase() === ADMIN_USER.toLowerCase() && pass === ADMIN_PASS) {
    writeLock({ count: 0, lockedUntil: null });
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ at: Date.now() }));
    } catch {
      /* ignore */
    }
    return { ok: true };
  }

  const s = readLock();
  const count = s.count + 1;
  if (count >= MAX_ATTEMPTS) {
    writeLock({ count: 0, lockedUntil: Date.now() + LOCK_MINUTES * 60_000 });
    return { ok: false, lockedMs: LOCK_MINUTES * 60_000 };
  }
  writeLock({ count, lockedUntil: null });
  return { ok: false, attemptsLeft: MAX_ATTEMPTS - count };
}

export function isAdminSession(): boolean {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const { at } = JSON.parse(raw) as { at: number };
    return Date.now() - at < SESSION_HOURS * 3_600_000;
  } catch {
    return false;
  }
}

export function endAdminSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/* ── RPC helpers ── */
export interface RpcResult<T> {
  data: T | null;
  error: string | null;
}
async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<RpcResult<T>> {
  if (!supabase) return { data: null, error: "Supabase offline hai — network check karo." };
  try {
    const { data, error } = await supabase.rpc(fn, args);
    return { data: data as T, error: error ? error.message : null };
  } catch (e) {
    return { data: null, error: (e as Error).message || "RPC failed" };
  }
}

/* ── shapes ── */
export interface AdminCustomer {
  id: string;
  name: string;
  phone: string;
  dane: number;
  created_at: string;
}

export interface AdminOrderRow {
  order_id: string;
  customer_name: string;
  phone: string;
  pickup: string | null;
  payment: "online" | "counter" | "redeem";
  paid: boolean;
  payment_id: string | null;
  total: number;
  grains_earned: number;
  items: { id?: string; name: string; pack: string; qty: number; price: number }[];
  status: "placed" | "ready" | "collected" | "cancelled";
  redeem: { reward: string; daneSpent: number } | null;
  created_at: string;
}

export interface AdminDayStat {
  day: string;
  order_count: number;
  revenue: number;
  dane_issued: number;
  online_orders: number;
  counter_orders: number;
  paid_orders: number;
}

/* ── customers / dane ── */
export const findCustomer = (phone: string) =>
  rpc<AdminCustomer[]>("admin_find_customer", { p_phone: phone });
export const spendDane = (phone: string, amount: number) =>
  rpc<number>("admin_spend_dane", { p_phone: phone, p_amount: amount });
export const creditDane = (phone: string, amount: number) =>
  rpc<number>("admin_credit_dane", { p_phone: phone, p_amount: amount });

/* ── orders ── */
export const listOrders = (limit = 40) =>
  rpc<AdminOrderRow[]>("admin_list_orders", { p_limit: limit });
export const markPaid = (orderId: string, paymentId?: string | null) =>
  rpc<void>("admin_mark_paid", { p_order_id: orderId, p_payment_id: paymentId ?? null });
export const setOrderStatus = (orderId: string, status: string) =>
  rpc<void>("admin_set_order_status", { p_order_id: orderId, p_status: status });
export const createCounterOrder = (o: {
  orderId: string;
  name: string;
  phone: string;
  pickup: string;
  payment: "online" | "counter" | "redeem";
  paid: boolean;
  total: number;
  grains: number;
  items: { id: string; name: string; pack: string; qty: number; price: number }[];
}) => rpc<void>("admin_create_order", {
  p_order_id: o.orderId,
  p_name: o.name,
  p_phone: o.phone,
  p_pickup: o.pickup,
  p_payment: o.payment,
  p_paid: o.paid,
  p_total: o.total,
  p_grains: o.grains,
  p_items: o.items,
});

/* ── stats ── */
export const dailyStats = (days = 7) =>
  rpc<AdminDayStat[]>("admin_daily_stats", { p_days: days });

/* ── products ── */
export const listAllProducts = () => rpc<Product[]>("admin_list_products", {});
export const toggleProduct = (id: string, active: boolean) =>
  rpc<void>("admin_toggle_product", { p_id: id, p_active: active });

export interface ProductUpsert {
  id: string;
  name: string;
  hindi: string;
  category: Product["category"];
  desc: string;
  story: string;
  heritage: string;
  craft: string[];
  purity: string[];
  since: number;
  image: string;
  tag: string;
  units: UnitOption[];
  sort: number;
}
export const upsertProduct = (p: ProductUpsert) =>
  rpc<void>("admin_upsert_product", {
    p_id: p.id,
    p_name: p.name,
    p_hindi: p.hindi,
    p_category: p.category,
    p_desc: p.desc,
    p_story: p.story,
    p_heritage: p.heritage,
    p_craft: p.craft,
    p_purity: p.purity,
    p_since: p.since,
    p_image: p.image,
    p_tag: p.tag,
    p_units: p.units,
    p_sort: p.sort,
  });
