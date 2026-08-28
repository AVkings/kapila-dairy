/* ── Kapila Dairy · Supabase layer (safe, always falls back) ───────── */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Customer, Order, Product } from "./data";
import { CATALOG } from "./data";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

/** Pull live products from the `products` table; fall back to the built-in catalogue. */
export async function fetchProducts(): Promise<Product[]> {
  if (!supabase) return CATALOG;
  try {
    const { data, error } = await supabase.from("products").select("*");
    if (error || !data || data.length === 0) return CATALOG;
    const valid = (data as Product[]).filter(
      (p) => p && p.id && p.name && Array.isArray(p.units) && p.image
    );
    return valid.length ? valid : CATALOG;
  } catch {
    return CATALOG;
  }
}

/** Persist an order to the `orders` table. Never throws. */
export async function saveOrderRemote(order: Order): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("orders").insert({
      order_id: order.id,
      customer_name: order.customerName,
      phone: order.phone,
      pickup: order.pickup,
      note: order.note ?? null,
      payment: order.payment,
      paid: order.paid,
      payment_id: order.paymentId ?? null,
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

/** Sync a loyalty customer to the `customers` table. Never throws. */
export async function upsertCustomerRemote(c: Customer): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("customers").upsert(
      {
        phone: c.phone,
        name: c.name,
        points: c.points,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "phone" }
    );
  } catch {
    /* offline-first: local copy already saved */
  }
}
