import orderHandler from "../../../netlify/functions/order";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return orderHandler(request, {} as never);
}
