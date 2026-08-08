import catalogRows from "../../catalog.json";
import newProductRows from "../../new-products.json";

const SUPABASE_URL = "https://fwjisaaorqubsjkdyidx.supabase.co";
const SUPABASE_KEY = "sb_publishable_l6bWX6LMqbeDGJGO0MmrvQ_okfxJcrm";

export async function GET() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=id.asc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  const remoteRows = response.ok ? await response.json() : catalogRows;
  const merged = new Map(
    [...remoteRows, ...newProductRows].map((product) => [String(product.id), product]),
  );
  return Response.json([...merged.values()], { headers: { "Cache-Control": "public, max-age=30" } });
}
