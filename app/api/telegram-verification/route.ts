import verificationHandler from "../../../netlify/functions/telegram-verification";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return verificationHandler(request, {} as never);
}

export async function POST(request: Request) {
  return verificationHandler(request, {} as never);
}
