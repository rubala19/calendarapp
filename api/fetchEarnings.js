import axios from "axios";

export default async function handler(req, res) {
  const { symbol } = req.query;
  const apiKey = process.env.ALPHAVANTAGE_KEY;
  const url = `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&symbol=${symbol}&horizon=3month&apikey=${apiKey}`;

  console.log(`📡 Fetching AlphaVantage CSV for ${symbol}`);
  try {
    const { data } = await axios.get(url, { responseType: "text" });

    console.log("📄 Raw CSV response (first 200 chars):", data.slice(0, 200));

    // Split lines
    const lines = data.trim().split("\n");
    const headers = lines[0].split(",");
    const rows = lines.slice(1).map(line => {
      const values = line.split(",");
      return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    });

    console.log("✅ Parsed earnings rows:", rows.slice(0, 3));

    const nextEarnings = rows[0]?.reportDate || null;
    if (!nextEarnings) {
      console.warn(`⚠️ No earnings date found for ${symbol}`);
      return res.status(404).json({ error: "No earnings date found", rows });
    }

    res.status(200).json({ symbol, nextEarnings });
  } catch (err) {
    console.error("❌ [FetchEarnings] Error:", err.message);
    res.status(500).json({ error: "Failed to fetch earnings", details: err.message });
  }
}
