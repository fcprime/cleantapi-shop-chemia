import type { Config, Context } from "@netlify/functions";

declare const Netlify: { env: { get(name: string): string | undefined } };

type Item = { productId?: unknown; size?: unknown; qty?: unknown };
type Variant = { size?: unknown; price?: unknown };
type Product = { id: string | number; name: string; price: number; variants?: string | Variant[]; in_stock?: boolean; category?: string };
const SUPABASE_URL = "https://fwjisaaorqubsjkdyidx.supabase.co";
const SUPABASE_KEY = "sb_publishable_l6bWX6LMqbeDGJGO0MmrvQ_okfxJcrm";

const clean = (value: unknown, max = 160) => String(value ?? "").trim().slice(0, max);
const escape = (value: unknown) => clean(value, 300).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
async function productIndex() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,price,variants,in_stock,category&active=eq.true`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!response.ok) return new Map<string, Product>();
  const products = await response.json() as Product[];
  return new Map(products.map(product => [String(product.id), product]));
}

function variants(product: Product) {
  try {
    const value = typeof product.variants === "string" ? JSON.parse(product.variants) : product.variants;
    if (Array.isArray(value) && value.length) return value.map((item) => ({ size: clean(item.size, 60) || "1 шт.", price: Number(item.price) || product.price }));
  } catch {}
  return [{ size: product.category === "sets" ? "1 набір" : "1 шт.", price: Number(product.price) || 0 }];
}

export default async (request: Request, _context: Context) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const token = Netlify.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Netlify.env.get("TELEGRAM_ORDER_CHAT_ID");
  if (!token || !chatId) return Response.json({ error: "Order service unavailable" }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  if (clean(body.website)) return Response.json({ ok: true });

  const name = clean(body.name, 100), phone = clean(body.phone, 40), country = clean(body.country, 80);
  const city = clean(body.city, 100), destination = clean(body.destination, 160), telegram = clean(body.telegram, 80) || "—";
  const delivery = clean(body.delivery, 20);
  const incoming = Array.isArray(body.items) ? body.items.slice(0, 50) as Item[] : [];
  if (name.length < 2 || phone.length < 6 || !country || !city || !destination || !incoming.length) return Response.json({ error: "Missing fields" }, { status: 400 });

  const verified: { name: string; size: string; qty: number; price: number }[] = [];
  const allProducts = await productIndex();
  for (const item of incoming) {
    const id = clean(item.productId, 80), qty = Math.max(1, Math.min(99, Number(item.qty) || 1));
    const product = allProducts.get(id);
    if (!product || product.in_stock === false) return Response.json({ error: "Unavailable product" }, { status: 409 });
    const size = clean(item.size, 60), variant = variants(product).find((entry) => entry.size === size);
    if (!variant) return Response.json({ error: "Invalid variant" }, { status: 409 });
    verified.push({ name: product.name, size, qty, price: variant.price });
  }

  const labels: Record<string, string> = { post: "InPost — поштомат", courier: "Кур’єр InPost / DHL", pickup: "Самовивіз", agree: "Узгодити з менеджером" };
  const total = verified.reduce((sum, item) => sum + item.qty * item.price, 0);
  const message = [
    "🔔 <b>НОВЕ ЗАМОВЛЕННЯ!</b>", "", `👤 Клієнт: ${escape(name)}`, `📞 Телефон: ${escape(phone)}`,
    `💬 Telegram: ${escape(telegram)}`, `🚚 Доставка: ${escape(labels[delivery] || labels.agree)}`, "",
    "📍 <b>Дані доставки:</b>", `Країна: ${escape(country)}`, `Місто: ${escape(city)}`,
    `Відділення / адреса: ${escape(destination)}`, "", "📦 <b>Товари:</b>",
    ...verified.map((item, index) => `${index + 1}. ${escape(item.name)} — ${escape(item.size)} — ${item.qty} шт. × ${item.price} zł`),
    "", `💰 <b>РАЗОМ: ${total} zł</b>`,
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const result = await response.json() as { ok?: boolean };
  if (!response.ok || !result.ok) return Response.json({ error: "Telegram delivery failed" }, { status: 502 });
  return Response.json({ ok: true });
};

export const config: Config = { path: "/api/order" };
