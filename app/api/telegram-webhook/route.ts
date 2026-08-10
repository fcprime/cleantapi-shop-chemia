import webhookHandler from "../../../netlify/functions/telegram-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return webhookHandler(request, {} as never);
}
