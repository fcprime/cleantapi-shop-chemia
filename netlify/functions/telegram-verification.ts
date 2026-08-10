import type { Config, Context } from "@netlify/functions";
import { clean, env, findVerification, randomToken, sha256, siteUrl, supabase, telegram } from "./_shared/shop";

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
      await supabase("telegram_verifications", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          flow_token: flowToken,
          browser_secret_hash: await sha256(browserSecret),
          language,
          expires_at: expiresAt,
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
      if (!flowToken || !browserSecret) return Response.json({ error: "Missing verification" }, { status: 400 });
      const verification = await findVerification(flowToken);
      if (!verification || verification.browser_secret_hash !== await sha256(browserSecret)) {
        return Response.json({ error: "Verification not found" }, { status: 404 });
      }
      const expired = Date.parse(verification.expires_at) <= Date.now();
      return Response.json({
        status: expired ? "expired" : verification.verified_at ? "verified" : "pending",
        username: verification.telegram_username,
        displayName: [verification.telegram_first_name, verification.telegram_last_name].filter(Boolean).join(" "),
        phone: verification.telegram_phone,
      });
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("Telegram verification failed", error);
    return Response.json({ error: "Verification service unavailable" }, { status: 503 });
  }
};

export const config: Config = { path: "/api/telegram-verification" };
