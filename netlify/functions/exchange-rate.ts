import type { Config } from "@netlify/functions";

const NBP_EUR_RATE_URL =
  "https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json";

type NbpRateResponse = {
  rates?: Array<{ effectiveDate?: string; mid?: number }>;
};

export default async () => {
  try {
    const response = await fetch(NBP_EUR_RATE_URL, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("nbp_unavailable");
    const result = (await response.json()) as NbpRateResponse;
    const latest = result.rates?.[0];
    const rate = Number(latest?.mid);
    if (!(rate > 3 && rate < 6)) throw new Error("invalid_rate");

    return Response.json(
      { currency: "EUR", rate, effectiveDate: latest?.effectiveDate || "" },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "Netlify-CDN-Cache-Control": "public, durable, max-age=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return Response.json({ error: "exchange_rate_unavailable" }, { status: 502 });
  }
};

export const config: Config = { path: "/.netlify/functions/exchange-rate" };
