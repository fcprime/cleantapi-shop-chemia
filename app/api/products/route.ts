const SUPABASE_URL = "https://fwjisaaorqubsjkdyidx.supabase.co";
const SUPABASE_KEY = "sb_publishable_l6bWX6LMqbeDGJGO0MmrvQ_okfxJcrm";

export async function GET() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=id.asc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!response.ok) return Response.json({ error: "Catalog unavailable" }, { status: 502 });
  return Response.json(await response.json(), { headers: { "Cache-Control": "public, max-age=30" } });
}
