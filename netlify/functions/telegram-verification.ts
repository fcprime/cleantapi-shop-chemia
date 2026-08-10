import type { Config, Context } from "@netlify/functions";
import { clean, env, findVerification, randomToken, sha256, siteUrl, supabase, telegram, validVerificationSecret } from "./_shared/shop";

const BOT_USERNAME = "cleantapishop_bot";

async function ensureWebhook() {
  const url = siteUrl();
  const secret = env("TELEGRAM_WEBHOOK_SECRET");
  if (!url || !secret) throw new Error("Webhook settings are missing");
  const info = await telegram<{ url?: string }>("getWebhookInfo", {});
  const target = `${url}/api/telegram-webhook`;
  if (info.url !== target) {
    await telegram("setWebhook", {
      url: target,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    });
  }
}

export default async (request: Request, _context: Context) => {
  try {
    if (request.method === "POST") {
      await ensureWebhook();
      const body = await request.json().catch(() => ({})) as Record<string, unknown>;
      const flowToken = randomToken(18);
      const browserSecret = randomToken(32);
      const language = clean(body.language, 2) === "ru" ? "ru" : "ua";
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
      const incomingDraft = body.draft && typeof body.draft === "object" ? body.draft as Record<string, unknown> : {};
      const incomingItems = Array.isArray(incomingDraft.items) ? incomingDraft.items.slice(0, 50) : [];
      const checkoutDraft = {
        name: clean(incomingDraft.name, 100),
        phone: clean(incomingDraft.phone, 20),
        phoneCode: clean(incomingDraft.phoneCode, 8) || "+48",
        delivery: clean(incomingDraft.delivery, 20) || "post",
        country: clean(incomingDraft.country, 80) || "Polska",
        city: clean(incomingDraft.city, 100),
        destination: clean(incomingDraft.destination, 160),
        items: incomingItems.map((raw) => {
          const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
          return {
            productId: clean(item.productId, 80),
            size: clean(item.size, 60),
            qty: Math.max(1, Math.min(99, Number(item.qty) || 1)),
          };
        }).filter((item) => item.productId && item.size),
      };
      await supabase("telegram_verifications", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          flow_token: flowToken,
          browser_secret_hash: await sha256(browserSecret),
          language,
          expires_at: expiresAt,
          checkout_draft: checkoutDraft,
        }),
      });
      return Response.json({
        flowToken,
        browserSecret,
        expiresAt,
        deepLink: `https://t.me/${BOT_USERNAME}?start=cv_${flowToken}`,
      });
    }

    if (request.method === "GET") {
      const url = new URL(request.url);
      const flowToken = clean(url.searchParams.get("flow"), 40);
      const browserSecret = clean(request.headers.get("x-verification-secret"), 100);
      const resumeToken = clean(request.headers.get("x-verification-resume"), 100);
      if (!flowToken || (!browserSecret && !resumeToken)) return Response.json({ error: "Missing verification" }, { status: 400 });
      const verification = await findVerification(flowToken);
      if (!verification || !await validVerificationSecret(verification, browserSecret, resumeToken)) {
        return Response.json({ error: "Verification not found" }, { status: 404 });
      }
      const expired = Date.parse(verification.expires_at) <= Date.now();
      return Response.json({
        status: expired ? "expired" : verification.verified_at ? "verified" : "pending",
        username: verification.telegram_username,
        displayName: [verification.telegram_first_name, verification.telegram_last_name].filter(Boolean).join(" "),
        phone: verification.telegram_phone,
        draft: verification.checkout_draft,
      });
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("Telegram verification failed", error);
    return Response.json({ error: "Verification service unavailable" }, { status: 503 });
  }
};

export const config: Config = { path: "/api/telegram-verification" };
