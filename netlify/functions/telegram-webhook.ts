import type { Config, Context } from "@netlify/functions";
import {
  clean,
  env,
  findLatestOrderByTelegram,
  findOrderByTopic,
  findVerification,
  managerChatId,
  siteUrl,
  supabase,
  telegram,
  verificationResumeToken,
} from "./_shared/shop";

type TgUser = { id: number; is_bot?: boolean; first_name?: string; last_name?: string; username?: string };
type TgChat = { id: number; type: string };
type TgMessage = {
  message_id: number;
  message_thread_id?: number;
  from?: TgUser;
  chat: TgChat;
  text?: string;
  contact?: { phone_number?: string; user_id?: number };
  forum_topic_created?: unknown;
  forum_topic_closed?: unknown;
  forum_topic_reopened?: unknown;
};
type TgCallback = { id: string; from: TgUser; data?: string; message?: TgMessage };
type TgUpdate = { update_id?: number; message?: TgMessage; callback_query?: TgCallback };

const localized = (language: string | null | undefined) => language === "ru" ? {
  share: "📱 Поделиться номером Telegram",
  intro: "Чтобы подтвердить заказ, нажмите кнопку ниже и поделитесь номером, привязанным к вашему Telegram.",
  confirmed: "✅ Telegram подтверждён.",
  return: "Продолжить оформление",
  returnHint: "🛒 Нажмите кнопку ниже. Откроется оформление заказа с уже подтверждённым Telegram:",
  expired: "Ссылка устарела. Вернитесь на сайт и нажмите «Подтвердить через Telegram» ещё раз.",
  wrongContact: "Пожалуйста, отправьте именно свой номер через кнопку ниже.",
  noOrder: "Telegram подтверждён. Сначала завершите оформление заказа на сайте.",
} : {
  share: "📱 Поділитися номером Telegram",
  intro: "Щоб підтвердити замовлення, натисніть кнопку нижче та поділіться номером, прив’язаним до вашого Telegram.",
  confirmed: "✅ Telegram підтверджено.",
  return: "Продовжити оформлення",
  returnHint: "🛒 Натисніть кнопку нижче. Відкриється оформлення замовлення з уже підтвердженим Telegram:",
  expired: "Посилання застаріло. Поверніться на сайт і натисніть «Підтвердити через Telegram» ще раз.",
  wrongContact: "Будь ласка, надішліть саме свій номер через кнопку нижче.",
  noOrder: "Telegram підтверджено. Спочатку завершіть оформлення замовлення на сайті.",
};

async function sendContactRequest(chatId: number, language: string | null | undefined) {
  const text = localized(language);
  await telegram("sendMessage", {
    chat_id: chatId,
    text: text.intro,
    reply_markup: {
      keyboard: [[{ text: text.share, request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
      input_field_placeholder: text.share,
    },
  });
}

async function handleStart(message: TgMessage, token: string) {
  const verification = await findVerification(token);
  if (!verification || verification.used_at || Date.parse(verification.expires_at) <= Date.now()) {
    await telegram("sendMessage", { chat_id: message.chat.id, text: localized(verification?.language).expired });
    return;
  }
  const user = message.from;
  if (!user) return;
  await supabase(`telegram_verifications?flow_token=eq.${encodeURIComponent(token)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      telegram_user_id: user.id,
      telegram_chat_id: message.chat.id,
      telegram_username: user.username || null,
      telegram_first_name: user.first_name || null,
      telegram_last_name: user.last_name || null,
    }),
  });
  await sendContactRequest(message.chat.id, verification.language);
}

async function handleContact(message: TgMessage) {
  if (!message.from || !message.contact) return;
  if (message.contact.user_id !== message.from.id) {
    await telegram("sendMessage", { chat_id: message.chat.id, text: localized("ua").wrongContact });
    return;
  }
  const rows = await supabase<Array<{ flow_token: string; language: string }>>(
    `telegram_verifications?telegram_user_id=eq.${message.from.id}&verified_at=is.null&used_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=flow_token,language&order=created_at.desc&limit=1`,
  );
  const verification = rows[0];
  if (!verification) {
    await telegram("sendMessage", { chat_id: message.chat.id, text: localized("ua").expired });
    return;
  }
  const verifiedAt = new Date().toISOString();
  await supabase(`telegram_verifications?flow_token=eq.${encodeURIComponent(verification.flow_token)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      telegram_phone: clean(message.contact.phone_number, 40),
      verified_at: verifiedAt,
    }),
  });
  const text = localized(verification.language);
  const url = siteUrl();
  const resumeToken = await verificationResumeToken({
    flow_token: verification.flow_token,
    telegram_user_id: message.from.id,
    verified_at: verifiedAt,
  });
  await telegram("sendMessage", {
    chat_id: message.chat.id,
    text: text.confirmed,
    reply_markup: { remove_keyboard: true },
  });
  if (url) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      text: text.returnHint,
      reply_markup: {
        inline_keyboard: [[{
          text: text.return,
          url: `${url}/?telegram_resume=${encodeURIComponent(`${verification.flow_token}.${resumeToken}`)}`,
        }]],
      },
    });
  }
}

async function relayCustomerMessage(message: TgMessage) {
  if (!message.from) return;
  const order = await findLatestOrderByTelegram(message.from.id);
  if (!order?.forum_topic_id) {
    await telegram("sendMessage", {
      chat_id: message.chat.id,
      text: localized(order?.order_data?.language === "ru" ? "ru" : "ua").noOrder,
    });
    return;
  }
  await telegram("copyMessage", {
    chat_id: managerChatId(),
    message_thread_id: order.forum_topic_id,
    from_chat_id: message.chat.id,
    message_id: message.message_id,
  });
}

async function relayManagerMessage(message: TgMessage) {
  if (!message.message_thread_id || message.from?.is_bot) return;
  if (message.forum_topic_created || message.forum_topic_closed || message.forum_topic_reopened) return;
  const order = await findOrderByTopic(message.message_thread_id);
  if (!order) return;
  await telegram("copyMessage", {
    chat_id: order.telegram_chat_id,
    from_chat_id: message.chat.id,
    message_id: message.message_id,
  });
}

async function handleCallback(callback: TgCallback) {
  const match = clean(callback.data, 80).match(/^st:([0-9a-f-]{36}):(work|done)$/);
  if (!match || !callback.message) return;
  const [, orderId, action] = match;
  const rows = await supabase<Array<{ order_number: number; customer_name: string; forum_topic_id: number | null }>>(
    `shop_orders?id=eq.${orderId}&select=order_number,customer_name,forum_topic_id&limit=1`,
  );
  const order = rows[0];
  if (!order) return;
  const status = action === "done" ? "completed" : "working";
  await supabase(`shop_orders?id=eq.${orderId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  });
  if (order.forum_topic_id) {
    await telegram("editForumTopic", {
      chat_id: managerChatId(),
      message_thread_id: order.forum_topic_id,
      name: `${action === "done" ? "✅" : "🟡"} #${order.order_number} — ${clean(order.customer_name, 70)}`,
    });
    if (action === "done") {
      await telegram("closeForumTopic", { chat_id: managerChatId(), message_thread_id: order.forum_topic_id });
    }
  }
  await telegram("answerCallbackQuery", {
    callback_query_id: callback.id,
    text: action === "done" ? "Замовлення завершено" : "Замовлення взято в роботу",
  });
}

export default async (request: Request, _context: Context) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const expectedSecret = env("TELEGRAM_WEBHOOK_SECRET");
  if (!expectedSecret || request.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const update = await request.json() as TgUpdate;
    if (update.callback_query) await handleCallback(update.callback_query);
    const message = update.message;
    if (message && message.chat.type !== "private" && message.text?.match(/^\/chatid(?:@\w+)?$/)) {
      await telegram("sendMessage", {
        chat_id: message.chat.id,
        text: `ID цієї групи: <code>${message.chat.id}</code>`,
        parse_mode: "HTML",
      });
      return Response.json({ ok: true });
    }
    if (message?.chat.type === "private") {
      const start = message.text?.match(/^\/start(?:@\w+)?\s+cv_([A-Za-z0-9_-]{20,40})$/);
      if (start) await handleStart(message, start[1]);
      else if (message.contact) await handleContact(message);
      else if (message.text !== "/start") await relayCustomerMessage(message);
    } else if (message && String(message.chat.id) === String(managerChatId())) {
      await relayManagerMessage(message);
    }
  } catch (error) {
    console.error("Telegram webhook failed", error);
    // Acknowledge updates so Telegram does not create an infinite retry loop.
  }
  return Response.json({ ok: true });
};

export const config: Config = { path: "/api/telegram-webhook" };
