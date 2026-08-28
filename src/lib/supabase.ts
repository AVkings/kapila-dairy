/* ── Kapila Dairy · Supabase layer (safe, always falls back) ───────── */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Customer, Order, Product } from "./data";
import { CATALOG } from "./data";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;
export const supabaseReady = !!supabase;

/* ── AUTH · email + password (phone saved in khata metadata) ───────── */
export async function loginWithEmail(
  name: string,
  email: string,
  password: string,
  phone10: string
): Promise<{ ok: boolean; error?: string; needsConfirm?: boolean }> {
  if (!supabase) return { ok: false, error: "offline" };
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signIn.error) return { ok: true };
  const msg = signIn.error.message.toLowerCase();
  if (msg.includes("invalid login") || msg.includes("not found") || msg.includes("invalid credentials")) {
    const meta = { name, full_name: name, phone: phone10 };
    const opts = { data: meta };
    const up = await supabase.auth.signUp({ email, password, options: opts });
    if (up.error) return { ok: false, error: up.error.message };
    if (up.data.session) return { ok: true };
    return { ok: false, needsConfirm: true };
  }
  return { ok: false, error: signIn.error.message };
}

export async function signOutUser(): Promise<void> {
  if (!supabase) return;
  try { await supabase.auth.signOut(); } catch { /* ignore */ }
}

/* ── profile row ── */
export interface ProfileRow {
  id: string;
  name: string;
  phone: string | null;
  dane: number;
  created_at: string;
}

export async function getSessionCustomer(): Promise<Customer | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    const { data: prof } = await supabase
      .from("profiles")
      .select("id,name,phone,dane,created_at")
      .eq("id", user.id)
      .maybeSingle();
    const row = (prof ?? null) as ProfileRow | null;
    const metaName = (user.user_metadata?.name as string) || (user.user_metadata?.full_name as string) || "";
    return {
      id: user.id,
      name: row?.name && row.name !== "Kapila Guest" ? row.name : metaName || "Kapila Guest",
      phone: row?.phone || (user.user_metadata?.phone as string) || user.phone || "",
      dane: row?.dane ?? 0,
      joinedAt: row?.created_at ?? user.created_at,
      authed: true,
    };
  } catch {
    return null;
  }
}

export async function ensureProfileName(userId: string, name: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("profiles").update({ name }).eq("id", userId);
  } catch { /* ignore */ }
}

/** Secure server-side dane increment (add_dane RPC). */
export async function creditDaneRemote(amount: number): Promise<number | null> {
  if (!supabase || amount <= 0) return null;
  try {
    const { data, error } = await supabase.rpc("add_dane", { amount });
    if (error) return null;
    return (data as number) ?? null;
  } catch { return null; }
}

/** Secure server-side dane spend for redemptions (redeem_dane RPC). */
export async function spendDaneRemote(amount: number): Promise<number | null> {
  if (!supabase || amount <= 0) return null;
  try {
    const { data, error } = await supabase.rpc("redeem_dane", { amount });
    if (error) return null;
    return (data as number) ?? null;
  } catch { return null; }
}

/* ── catalogue ── */
export async function fetchProducts(): Promise<Product[]> {
  if (!supabase) return CATALOG;
  try {
    const { data, error } = await supabase.from("products").select("*").order("sort");
    if (error || !data || data.length === 0) return CATALOG;
    const valid = (data as Product[]).filter(
      (p) => p && p.id && p.name && Array.isArray(p.units) && p.image
    );
    return valid.length ? valid : CATALOG;
  } catch { return CATALOG; }
}

/* ── orders ── */
export async function saveOrderRemote(order: Order, userId: string | null): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("orders").insert({
      order_id: order.id,
      user_id: userId,
      customer_name: order.customerName,
      phone: order.phone,
      pickup: order.pickup,
      note: order.note ?? null,
      payment: order.payment,
      paid: order.paid,
      payment_id: order.paymentId ?? null,
      total: order.total,
      grains_earned: order.grainsEarned,
      redeem: order.redeem ?? null,
      items: order.items.map((i) => ({
        id: i.productId, name: i.name, pack: i.unit.label, qty: i.qty, price: i.unit.price,
      })),
      status: "placed",
    });
    return !error;
  } catch { return false; }
}

/* ── pay page (counter QR → hosted exact-amount checkout) ── */
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

export async function getPayOrder(orderId: string): Promise<PayOrder | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("get_pay_order", { p_order: orderId });
    if (error || !data) return null;
    return data as PayOrder;
  } catch { return null; }
}

export async function confirmOnlinePayment(orderId: string, paymentId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc("confirm_online_payment", {
      p_order: orderId,
      p_payment_id: paymentId,
    });
    return !error && data !== false;
  } catch { return false; }
}

/** Quick health-check for the footer badge. */
export type CatalogSource = "supabase" | "local";
export async function pingSupabase(): Promise<CatalogSource> {
  if (!supabase) return "local";
  try {
    const { error } = await supabase.from("products").select("id", { count: "exact", head: true });
    return error ? "local" : "supabase";
  } catch { return "local"; }
}
