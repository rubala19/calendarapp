// Force Node runtime (important for Vercel)
export const config = { runtime: "nodejs" };

// Optional: import your Alpha Vantage fetch helper
// or inline it below
async function fetchEarningsAlphaVantage(ticker, apiKey) {
  try {
    const url = `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&symbol=${ticker}&horizon=3month&apikey=${apiKey}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const text = await res.text();

    console.log(`[AlphaVantage] ${ticker} response:`, text.slice(0, 100));

    if (!text.includes("reportDate")) throw new Error("Invalid response from Alpha Vantage");
    const lines = text.trim().split("\n");
    if (lines.length <= 1) return null;

    const row = lines[1].split(",");
    const [symbol, name, reportDate, fiscalDateEnding, estimate, currency] = row;
    if (!reportDate || reportDate === "None") return null;

    return {
      symbol: symbol || ticker.toUpperCase(),
      name: name || ticker.toUpperCase(),
      date: reportDate,
      fiscalDateEnding,
      estimate,
      currency,
      source: "AlphaVantage",
    };
  } catch (err) {
    console.error(`[AlphaVantage Error] ${ticker}:`, err.message);
    return null;
  }
}

export default async function handler(req, res) {
  console.log("🚀 /api/events called with method:", req.method);

  const ALPHAVANTAGE_KEY = process.env.ALPHAVANTAGE_KEY;
  const JSONBIN_ID = process.env.JSONBIN_ID;
  const JSONBIN_KEY = process.env.JSONBIN_KEY;

  if (!ALPHAVANTAGE_KEY || !JSONBIN_ID || !JSONBIN_KEY) {
    console.error("❌ Missing required environment variables");
    return res.status(500).json({ error: "Server misconfigured: missing API keys" });
  }

  // ---- GET: Fetch events from JSONBin ----
  if (req.method === "GET") {
    try {
      const jsonResp = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}/latest`, {
        headers: {
          "X-Master-Key": JSONBIN_KEY,
          "User-Agent": "Mozilla/5.0",
        },
      });

      if (!jsonResp.ok) {
        const txt = await jsonResp.text();
        console.error("❌ JSONBin GET failed:", txt);
        throw new Error(`JSONBin GET failed (${jsonResp.status})`);
      }

      const data = await jsonResp.json();
      console.log("✅ JSONBin fetched records:", Array.isArray(data.record) ? data.record.length : typeof data.record);

      return res.status(200).json({ events: data.record || [] });
    } catch (err) {
      console.error("⚠️ Error fetching JSONBin:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ---- POST: Add new event ----
  if (req.method === "POST") {
    try {
      const { ticker } = await req.json();
      if (!ticker) return res.status(400).json({ error: "Missing ticker symbol" });

      console.log("➕ Adding new event for:", ticker);

      // Step 1. Fetch existing events
      const existingRe
