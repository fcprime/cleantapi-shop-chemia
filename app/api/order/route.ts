type IncomingItem = {
  productId?: unknown;
  name?: unknown;
  size?: unknown;
  qty?: unknown;
  unitPrice?: unknown;
};

type CatalogRow = {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  variants?: unknown;
  in_stock?: unknown;
  category?: unknown;
};

type VerifiedItem = {
  name: string;
  size: string;
  qty: number;
  unitPrice: number;
};

const SUPABASE_URL = "https://fwjisaaorqubsjkdyidx.supabase.co";
const SUPABASE_KEY = "sb_publishable_l6bWX6LMqbeDGJGO0MmrvQ_okfxJcrm";
const text = (value: unknown, max = 160) => String(value ?? "").trim().slice(0, max);
const html = (value: unknown, max = 300) => text(value, max)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

function variantsFor(row: CatalogRow) {
  try {
    const parsed = typeof row.variants === "string" ? JSON.parse(row.variants) : row.variants;
    if (Array.isArray(parsed) && parsed.length) {
      return parsed
        .filter((variant): variant is { size?: unknown; price?: unknown } => Boolean(variant) && typeof variant === "object")
        .map((variant) => ({ size: text(variant.size, 60) || "1 шт.", price: Math.max(0, Number(variant.price) || Number(row.price) || 0) }));
    }
  } catch {
    // Invalid variants fall back to the product's base price.
  }
  return [{ size: row.category === "sets" ? "1 набір" : "1 шт.", price: Math.max(0, Number(row.price) || 0) }];
}

async function getCatalog(): Promise<CatalogRow[]> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,price,variants,in_stock,category&active=eq.true`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: "no-store",
    });
    if (response.ok) return await response.json() as CatalogRow[];
  } catch {
    // Keep ordering available during a temporary catalog service outage.
  }
  return [];
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ORDER_CHAT_ID || process.env.TELEGRAM_ORDERS_CHAT_ID;
  if (!token || !chatId) {
    return Response.json({ error: "Order service is unavailable" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }

  // Quietly accept bot submissions from the hidden field.
  if (text(body.website)) return Response.json({ ok: true });

  const name = text(body.name, 100);
  const phone = text(body.phone, 40);
  const telegram = text(body.telegram, 80) || "—";
  const delivery = text(body.delivery, 20);
  const country = text(body.country, 80);
  const city = text(body.city, 100);
  const destination = text(body.destination, 160);
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 50) as IncomingItem[] : [];

  if (name.length < 2 || phone.length < 6 || !country || !city || !destination || rawItems.length === 0) {
    return Response.json({ error: "Required fields are missing" }, { status: 400 });
  }

  const catalog = await getCatalog();
  const catalogById = new Map(catalog.map((row) => [text(row.id, 80), row]));
  const items: VerifiedItem[] = [];
  for (const incoming of rawItems) {
    const requestedId = text(incoming.productId, 80);
    const product = catalogById.get(requestedId);
    if (!product || product.in_stock === false || product.in_stock === "false") {
      return Response.json({ error: "A product is unavailable" }, { status: 409 });
    }
    const variants = variantsFor(product);
    const requestedSize = text(incoming.size, 60);
    const variant = variants.find((candidate) => candidate.size === requestedSize);
    if (!variant) return Response.json({ error: "Invalid product variant" }, { status: 409 });
    items.push({
      name: text(product.name, 110),
      size: variant.size,
      qty: Math.max(1, Math.min(99, Number(incoming.qty) || 1)),
      unitPrice: variant.price,
    });
  }
  if (!items.length) return Response.json({ error: "Cart is empty" }, { status: 400 });

  const total = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const deliveryLabels: Record<string, string> = {
    post: "Поштове відправлення",
    courier: "Кур’єр",
    pickup: "Самовивіз",
    agree: "Узгодити з менеджером",
  };
  const itemLines = items.map((item, index) =>
    `${index + 1}. ${html(item.name)}${item.size ? ` — ${html(item.size)}` : ""} — ${item.qty} шт. × ${item.unitPrice} zł`
  );
  const message = [
    "🔔 <b>НОВЕ ЗАМОВЛЕННЯ!</b>",
    "",
    `👤 Клієнт: ${html(name)}`,
    `📞 Телефон: ${html(phone)}`,
    `💬 Telegram: ${html(telegram)}`,
    `🚚 Спосіб доставки: ${html(deliveryLabels[delivery] || deliveryLabels.agree)}`,
    "",
    "📍 <b>Дані доставки:</b>",
    `Країна: ${html(country)}`,
    `Місто: ${html(city)}`,
    `Відділення / адреса: ${html(destination)}`,
    "",
    "📦 <b>Товари:</b>",
    ...itemLines,
    "",
    `💰 <b>РАЗОМ: ${total} zł</b>`,
  ].join("\n");

  const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const result = await telegramResponse.json() as { ok?: boolean; description?: string };
  if (!telegramResponse.ok || !result.ok) {
    console.error("Telegram order delivery failed", result.description || telegramResponse.status);
    return Response.json({ error: "Could not send order" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
