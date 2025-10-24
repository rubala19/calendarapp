import axios from "axios";

export default async function handler(req, res) {
  const { symbol } = req.query;
  const apiKey = process.env.ALPHAVANTAGE_KEY;
  const url = `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&symbol=${symbol}&horizon=3month&apikey=${apiKey}`;

  console.log(`📡 [FetchEarnings] Fetching AlphaVantage data for ${symbol}`);
  console.log(`🔗 URL: ${url}`);

  try {
    const { data } = await axios.get(url, { timeout: 15000 });
    console.log("✅ Raw AlphaVantage response keys:", Object.keys(data));
    console.log("🧩 Sample record:", data?.earningsCalendar?.[0] || "(none)");

    const nextEarnings = data?.earningsCalendar?.[0]?.reportDate || null;

    if (!nextEarnings) {
      console.warn(`⚠️ No earnings date found for ${symbol}`);
      return res.status(404).json({ error: "No earnings date found", data });
    }

    console.log(`🎯 Parsed next earnings date for ${symbol}: ${nextEarnings}`);
    res.status(200).json({ symbol, nextEarnings });
  } catch (err) {
    console.error("❌ [FetchEarnings] Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch earnings", details: err.message });
  }
}
