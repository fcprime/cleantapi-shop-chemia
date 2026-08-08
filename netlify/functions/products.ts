import catalog from "../../app/catalog.json";
import newProducts from "../../app/new-products.json";

export default async () => {
  const products = new Map(
    [...catalog, ...newProducts].map((product) => [String(product.id), product]),
  );

  return Response.json([...products.values()], {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
};

export const config = { path: "/.netlify/functions/products" };
