const DEFAULT_SUPABASE_URL = "https://fwjisaaorqubsjkdyidx.supabase.co";

declare const Netlify: { env?: { get(name: string): string | undefined } } | undefined;

export type TelegramVerification = {
  id: string;
  flow_token: string;
  browser_secret_hash: string;
  language: string;
  telegram_user_id: number | null;
  telegram_chat_id: number | null;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  telegram_phone: string | null;
  verified_at: string | null;
  used_at: string | null;
  expires_at: string;
  checkout_draft: Record<string, unknown> | null;
};

export type ShopOrder = {
  id: string;
  order_number: number;
  verification_id: string;
  telegram_user_id: number;
  telegram_chat_id: number;
  telegram_username: string | null;
  telegram_phone: string | null;
  forum_topic_id: number | null;
  customer_name: string;
  status: string;
  order_data: Record<string, unknown>;
  created_at: string;
};

export function env(name: string) {
  try {
    if (typeof Netlify !== "undefined") return Netlify.env?.get(name) || process.env[name];
  } catch {}
  return process.env[name];
}

export function clean(value: unknown, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

export function escapeHtml(value: unknown, max = 500) {
  return clean(value, max)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function randomToken(bytes = 18) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Buffer.from(data).toString("base64url");
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Buffer.from(digest).toString("hex");
}

export async function verificationResumeToken(verification: Pick<TelegramVerification, "flow_token" | "telegram_user_id" | "verified_at">) {
  const secret = env("TELEGRAM_WEBHOOK_SECRET");
  if (!secret || !verification.telegram_user_id || !verification.verified_at) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const payload = `${verification.flow_token}:${verification.telegram_user_id}:${verification.verified_at}`;
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Buffer.from(signature).toString("base64url");
}

function sameSecret(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function validVerificationSecret(
  verification: TelegramVerification,
  browserSecret: string,
  resumeToken: string,
) {
  if (browserSecret && verification.browser_secret_hash === await sha256(browserSecret)) return true;
  if (!resumeToken || !verification.verified_at) return false;
  return sameSecret(resumeToken, await verificationResumeToken(verification));
}

export async function supabase<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = env("SUPABASE_URL") || DEFAULT_SUPABASE_URL;
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase ${response.status}: ${detail.slice(0, 400)}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function telegram<T = unknown>(method: string, payload: Record<string, unknown>) {
  const token = env("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json() as { ok?: boolean; result?: T; description?: string };
  if (!response.ok || !result.ok) throw new Error(result.description || `Telegram ${response.status}`);
  return result.result as T;
}

export function managerChatId() {
  const value = env("TELEGRAM_MANAGER_CHAT_ID") || env("TELEGRAM_ORDER_CHAT_ID") || env("TELEGRAM_ORDERS_CHAT_ID");
  if (!value) throw new Error("TELEGRAM_MANAGER_CHAT_ID is missing");
  return value;
}

export function siteUrl() {
  return (env("SITE_URL") || env("URL") || "").replace(/\/$/, "");
}

export async function findVerification(flowToken: string) {
  const rows = await supabase<TelegramVerification[]>(
    `telegram_verifications?flow_token=eq.${encodeURIComponent(flowToken)}&select=*&limit=1`,
  );
  return rows[0] || null;
}

export async function findOrderByTopic(topicId: number) {
  const rows = await supabase<ShopOrder[]>(
    `shop_orders?forum_topic_id=eq.${topicId}&select=*&limit=1`,
  );
  return rows[0] || null;
}

export async function findLatestOrderByTelegram(userId: number) {
  const rows = await supabase<ShopOrder[]>(
    `shop_orders?telegram_user_id=eq.${userId}&status=neq.completed&select=*&order=created_at.desc&limit=1`,
  );
  return rows[0] || null;
}
