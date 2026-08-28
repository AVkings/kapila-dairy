/* ── Kapila Dairy · Supabase layer (auth + profiles + orders) ──────── */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Customer, Order, Product } from "./data";
import { CATALOG } from "./data";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const supabaseReady = !!supabase;

/* ── helpers ── */
export interface ProfileRow {
  id: string;
  name: string;
  phone: string | null;
  dane: number;
  created_at: string;
}

export const profileToCustomer = (row: ProfileRow): Customer => ({
  id: row.id,
  name: row.name || "Kapila Guest",
  phone: (row.phone ?? "").replace(/^\+91/, ""),
  dane: row.dane ?? 0,
  joinedAt: row.created_at,
  authed: true,
});

/* ── AUTH · email + password (phone saved in khata metadata) ───────── */
export async function loginWithEmail(
  name: string,
  email: string,
  password: string,
  phone10: string
): Promise<{ ok: boolean; error?: string; needsConfirm?: boolean }> {
  if (!supabase) return { ok: false, error: "offline" };

  // try existing account first
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signIn.error) return { ok: true };

  const msg = signIn.error.message.toLowerCase();
  if (msg.includes("invalid login") || msg.includes("not found") || msg.includes("invalid credentials")) {
    const up = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, full_name: name, phone: phone10 } },
    });
    if (up.error) return { ok: false, error: up.error.message };
    if (up.data.session) return { ok: true };
    return { ok: false, needsConfirm: true };
  }
  return { ok: false, error: signIn.error.message };
}

export async function signOutUser(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
}

/** Current logged-in customer (from profiles table). */
export async function getSessionCustomer(): Promise<Customer | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;

    let { data: row } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!row) {
      // trigger may not have fired yet (or table is fresh) — create it
      const fallback: ProfileRow = {
        id: user.id,
        name: (user.user_metadata?.full_name as string) || "Kapila Guest",
        phone: user.phone || (user.user_metadata?.phone as string) || "",
        dane: 0,
        created_at: new Date().toISOString(),
      };
      await supabase.from("profiles").upsert(
        { id: fallback.id, name: fallback.name, phone: fallback.phone },
        { onConflict: "id" }
      );
      row = fallback;
    }
    return profileToCustomer(row as ProfileRow);
  } catch {
    return null;
  }
}

/** Keep the profile's name in sync (e.g. guest pending-credit login). */
export async function ensureProfileName(uid: string, name: string): Promise<void> {
  if (!supabase || !name) return;
  try {
    await supabase.from("profiles").update({ name }).eq("id", uid);
  } catch {
    /* ignore */
  }
}

/** Add dane via the safe server-side RPC (client can't fake the total). */
export async function creditDaneRemote(amount: number): Promise<number | null> {
  if (!supabase || amount <= 0) return null;
  try {
    const { data, error } = await supabase.rpc("add_dane", { amount });
    if (error) return null;
    return typeof data === "number" ? data : null;
  } catch {
    return null;
  }
}

/** Redeem (spend) dane via the safe server-side RPC. Returns new balance. */
export async function spendDaneRemote(amount: number): Promise<number | null> {
  if (!supabase || amount <= 0) return null;
  try {
    const { data, error } = await supabase.rpc("redeem_dane", { amount });
    if (error) return null;
    return typeof data === "number" ? data : null;
  } catch {
    return null;
  }
}

/* ── PRODUCTS / ORDERS ─────────────────────────────────────────────── */

/** Pull live products; fall back to the built-in catalogue. */
export async function fetchProducts(): Promise<Product[]> {
  if (!supabase) return CATALOG;
  try {
    const { data, error } = await supabase.from("products").select("*").order("sort");
    if (error || !data || data.length === 0) return CATALOG;
    const valid = (data as Array<Partial<Product> & { "desc"?: string }>).filter(
      (p) => p && p.id && p.name && Array.isArray(p.units) && p.image
    );
    const mapped: Product[] = valid.map((p) => ({
      id: p.id as string,
      name: p.name as string,
      hindi: p.hindi ?? "",
      desc: (p as { desc?: string }).desc ?? (p as { "desc"?: string })["desc"] ?? "",
      story: p.story ?? "",
      heritage: p.heritage ?? p.story ?? "",
      craft: Array.isArray(p.craft) ? (p.craft as string[]) : [],
      purity: Array.isArray(p.purity) ? (p.purity as string[]) : [],
      since: typeof p.since === "number" ? p.since : 1974,
      category: (p.category as Product["category"]) ?? "sweets",
      image: p.image as string,
      units: p.units as Product["units"],
      tag: p.tag ?? undefined,
      rating: Number(p.rating ?? 4.6),
      reviews: Number(p.reviews ?? 0),
    }));
    return mapped.length ? mapped : CATALOG;
  } catch {
    return CATALOG;
  }
}

/* ── HOSTED PAY PAGE (Razorpay exact-amount link) ──────────────────── */
export interface PayOrder {
  order_id: string;
  customer_name: string;
  phone: string;
  total: number;
  paid: boolean;
  payment: string;
  status: string;
  pickup: string | null;
  redeem: { reward: string; daneSpent: number } | null;
  items: { name: string; qty: number; pack: string; price: number }[];
}

/** Fetch minimal order data for the public pay page. */
export async function getPayOrder(orderId: string): Promise<PayOrder | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("get_pay_order", { p_order: orderId });
    if (error || !data) return null;
    return data as PayOrder;
  } catch {
    return null;
  }
}

/** Mark an order paid after Razorpay checkout succeeds on the pay page. */
export async function confirmOnlinePayment(orderId: string, paymentId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc("confirm_online_payment", {
      p_order: orderId,
      p_payment_id: paymentId,
    });
    return !error && data !== false;
  } catch {
    return false;
  }
}

export type CatalogSource = "supabase" | "local";

/** Quick health-check against the project (for the connection badge). */
export async function pingSupabase(): Promise<CatalogSource> {
  if (!supabase) return "local";
  try {
    const { error } = await supabase.from("products").select("id", { head: true, count: "exact" });
    return error ? "local" : "supabase";
  } catch {
    return "local";
  }
}

/** Persist an order (with optional logged-in user_id). Never throws. */
export async function saveOrderRemote(order: Order, userId?: string | null): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("orders").insert({
      order_id: order.id,
      customer_name: order.customerName,
      phone: order.phone,
      user_id: userId ?? null,
      pickup: order.pickup,
      note: order.note ?? null,
      payment: order.payment,
      paid: order.paid,
      payment_id: order.paymentId ?? null,
      redeem: order.redeem ?? null,
      total: order.total,
      grains_earned: order.grainsEarned,
      items: order.items.map((i) => ({
        id: i.productId,
        name: i.name,
        pack: i.unit.label,
        qty: i.qty,
        price: i.unit.price,
      })),
      status: "placed",
    });
    return !error;
  } catch {
    return false;
  }
}
