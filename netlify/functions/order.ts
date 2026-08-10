import type { Config, Context } from "@netlify/functions";
import {
  ShopOrder,
  clean,
  env,
  escapeHtml,
  findVerification,
  managerChatId,
  supabase,
  telegram,
  validVerificationSecret,
} from "./_shared/shop";

type Item = { productId?: unknown; size?: unknown; qty?: unknown };
type Variant = { size?: unknown; price?: unknown };
type Product = { id: string | number; name: string; price: number; variants?: string | Variant[]; in_stock?: boolean; category?: string };
type ForumTopic = { message_thread_id: number; name: string };

const SUPABASE_URL = "https://fwjisaaorqubsjkdyidx.supabase.co";
const SUPABASE_KEY = "sb_publishable_l6bWX6LMqbeDGJGO0MmrvQ_okfxJcrm";

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
    if (Array.isArray(value) && value.length) {
      return value.map((item) => ({ size: clean(item.size, 60) || "1 шт.", price: Number(item.price) || product.price }));
    }
  } catch {}
  return [{ size: product.category === "sets" ? "1 набір" : "1 шт.", price: Number(product.price) || 0 }];
}

async function existingOrder(verificationId: string) {
  const rows = await supabase<ShopOrder[]>(
    `shop_orders?verification_id=eq.${verificationId}&select=*&limit=1`,
  );
  return rows[0] || null;
}

export default async (request: Request, _context: Context) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    if (!env("TELEGRAM_BOT_TOKEN") || !managerChatId()) {
      return Response.json({ error: "order_service_unavailable" }, { status: 503 });
    }

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return Response.json({ error: "Invalid request" }, { status: 400 });
    if (clean(body.website)) return Response.json({ ok: true });

    // Temporary simplified checkout. The verified Telegram flow below remains
    // intact and can be restored from the UI with SIMPLE_CHECKOUT = false.
    if (clean(body.checkoutMode, 20) === "simple") {
      const name = clean(body.name, 100);
      const phone = clean(body.phone, 40);
      const telegramUsername = clean(body.telegramUsername, 64)
        .replace(/^https?:\/\/(?:www\.)?t\.me\//i, "")
        .replace(/^t\.me\//i, "")
        .replace(/^@/, "")
        .split(/[/?#]/)[0];
      const incoming = Array.isArray(body.items) ? body.items.slice(0, 50) as Item[] : [];
      if (
        name.length < 2 ||
        phone.replace(/\D/g, "").length < 6 ||
        !/^[A-Za-z0-9_]{5,32}$/.test(telegramUsername) ||
        !incoming.length
      ) {
        return Response.json({ error: "missing_fields" }, { status: 400 });
      }

      const checked: { productId: string; name: string; size: string; qty: number; price: number }[] = [];
      const allProducts = await productIndex();
      for (const item of incoming) {
        const id = clean(item.productId, 80);
        const qty = Math.max(1, Math.min(99, Number(item.qty) || 1));
        const product = allProducts.get(id);
        if (!product || product.in_stock === false) {
          return Response.json({ error: "unavailable_product" }, { status: 409 });
        }
        const size = clean(item.size, 60);
        const variant = variants(product).find((entry) => entry.size === size);
        if (!variant) return Response.json({ error: "invalid_variant" }, { status: 409 });
        checked.push({ productId: id, name: product.name, size, qty, price: variant.price });
      }

      const total = checked.reduce((sum, item) => sum + item.qty * item.price, 0);
      const orderNumber = `S${Date.now().toString().slice(-8)}`;
      const topic = await telegram<ForumTopic>("createForumTopic", {
        chat_id: managerChatId(),
        name: `🟢 #${orderNumber} — ${clean(name, 70)}`,
        icon_color: 9367192,
      });
      const itemLines = checked.map((item, index) =>
        `${index + 1}. ${escapeHtml(item.name)} — ${escapeHtml(item.size)} — ${item.qty} шт. × ${item.price} zł`
      );
      const message = [
        `🔔 <b>ЗАМОВЛЕННЯ #${orderNumber}</b>`, "",
        `👤 Клієнт: ${escapeHtml(name)}`,
        `📞 Телефон: ${escapeHtml(phone)}`,
        `💬 Telegram: <a href="https://t.me/${telegramUsername}">@${escapeHtml(telegramUsername)}</a>`,
        `🚚 Доставка: узгодити з клієнтом`, "",
        "📦 <b>Товари:</b>", ...itemLines, "",
        `💰 <b>РАЗОМ: ${total} zł</b>`, "",
        "Напишіть клієнту за вказаним Telegram або номером телефону.",
      ].join("\n");
      await telegram("sendMessage", {
        chat_id: managerChatId(),
        message_thread_id: topic.message_thread_id,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
      return Response.json({ ok: true, orderNumber });
    }

    const verificationBody = body.telegramVerification as Record<string, unknown> | undefined;
    const flowToken = clean(verificationBody?.flowToken, 40);
    const browserSecret = clean(verificationBody?.browserSecret, 100);
    const resumeToken = clean(verificationBody?.resumeToken, 100);
    const verification = flowToken ? await findVerification(flowToken) : null;
    if (
      !verification ||
      !verification.verified_at ||
      verification.used_at ||
      !verification.telegram_user_id ||
      !verification.telegram_chat_id ||
      !verification.telegram_phone ||
      Date.parse(verification.expires_at) <= Date.now() ||
      !await validVerificationSecret(verification, browserSecret, resumeToken)
    ) {
      return Response.json({ error: "telegram_verification_required" }, { status: 403 });
    }

    const name = clean(body.name, 100), phone = clean(body.phone, 40), country = clean(body.country, 80);
    const city = clean(body.city, 100), destination = clean(body.destination, 160), delivery = clean(body.delivery, 20);
    const language = clean(body.language, 2) === "ru" ? "ru" : "ua";
    const incoming = Array.isArray(body.items) ? body.items.slice(0, 50) as Item[] : [];
    if (name.length < 2 || phone.length < 6 || !country || !city || !destination || !incoming.length) {
      return Response.json({ error: "missing_fields" }, { status: 400 });
    }

    const verified: { productId: string; name: string; size: string; qty: number; price: number }[] = [];
    const allProducts = await productIndex();
    for (const item of incoming) {
      const id = clean(item.productId, 80), qty = Math.max(1, Math.min(99, Number(item.qty) || 1));
      const product = allProducts.get(id);
      if (!product || product.in_stock === false) return Response.json({ error: "unavailable_product" }, { status: 409 });
      const size = clean(item.size, 60), variant = variants(product).find((entry) => entry.size === size);
      if (!variant) return Response.json({ error: "invalid_variant" }, { status: 409 });
      verified.push({ productId: id, name: product.name, size, qty, price: variant.price });
    }

    const labels: Record<string, string> = {
      post: "InPost — поштомат", courier: "Кур’єр InPost / DHL", pickup: "Самовивіз", agree: "Узгодити з менеджером",
    };
    const total = verified.reduce((sum, item) => sum + item.qty * item.price, 0);
    const orderData = {
      phone,
      telegramPhone: verification.telegram_phone,
      delivery,
      deliveryLabel: labels[delivery] || labels.agree,
      country,
      city,
      destination,
      language,
      items: verified,
      total,
      currency: "PLN",
    };

    let order = await existingOrder(verification.id);
    if (!order) {
      const rows = await supabase<ShopOrder[]>("shop_orders", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          verification_id: verification.id,
          telegram_user_id: verification.telegram_user_id,
          telegram_chat_id: verification.telegram_chat_id,
          telegram_username: verification.telegram_username,
          telegram_phone: verification.telegram_phone,
          customer_name: name,
          status: "new",
          order_data: orderData,
        }),
      });
      order = rows[0];
    }
    if (!order) throw new Error("Order row was not created");

    let topicId = order.forum_topic_id;
    if (!topicId) {
      const topic = await telegram<ForumTopic>("createForumTopic", {
        chat_id: managerChatId(),
        name: `🟢 #${order.order_number} — ${clean(name, 70)}`,
        icon_color: 9367192,
      });
      topicId = topic.message_thread_id;
      await supabase(`shop_orders?id=eq.${order.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ forum_topic_id: topicId, updated_at: new Date().toISOString() }),
      });
    }

    const telegramName = verification.telegram_username
      ? `@${verification.telegram_username}`
      : [verification.telegram_first_name, verification.telegram_last_name].filter(Boolean).join(" ") || "без username";
    const itemLines = verified.map((item, index) =>
      `${index + 1}. ${escapeHtml(item.name)} — ${escapeHtml(item.size)} — ${item.qty} шт. × ${item.price} zł`
    );
    const message = [
      `🔔 <b>ЗАМОВЛЕННЯ #${order.order_number}</b>`, "",
      `✅ Telegram підтверджено`,
      `👤 Клієнт: ${escapeHtml(name)}`,
      `💬 Telegram: ${escapeHtml(telegramName)}`,
      `🆔 Telegram ID: <code>${verification.telegram_user_id}</code>`,
      `📱 Номер із Telegram: ${escapeHtml(verification.telegram_phone)}`,
      `📞 Номер із форми: ${escapeHtml(phone)}`,
      `🚚 Доставка: ${escapeHtml(labels[delivery] || labels.agree)}`, "",
      "📍 <b>Дані доставки:</b>",
      `Країна: ${escapeHtml(country)}`,
      `Місто: ${escapeHtml(city)}`,
      `Відділення / адреса: ${escapeHtml(destination)}`, "",
      "📦 <b>Товари:</b>", ...itemLines, "",
      `💰 <b>РАЗОМ: ${total} zł</b>`, "",
      "Відповідайте клієнту прямо в цій темі — бот перенесе повідомлення у приватний діалог.",
    ].join("\n");
    await telegram("sendMessage", {
      chat_id: managerChatId(),
      message_thread_id: topicId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [[
          { text: "🟡 Взяти в роботу", callback_data: `st:${order.id}:work` },
          { text: "✅ Завершити", callback_data: `st:${order.id}:done` },
        ]],
      },
    });
    await telegram("sendMessage", {
      chat_id: verification.telegram_chat_id,
      text: language === "ru"
        ? `✅ Заказ #${order.order_number} получен. Менеджер ответит вам здесь.`
        : `✅ Замовлення #${order.order_number} отримано. Менеджер відповість вам тут.`,
      reply_markup: { remove_keyboard: true },
    });
    await supabase(`telegram_verifications?id=eq.${verification.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ used_at: new Date().toISOString() }),
    });

    return Response.json({ ok: true, orderNumber: order.order_number });
  } catch (error) {
    console.error("Order processing failed", error);
    return Response.json({ error: "order_service_unavailable" }, { status: 503 });
  }
};

export const config: Config = { path: "/api/order" };
