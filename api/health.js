// /api/health.js
import axios from "axios";

const BIN_ID = "68f7ee9c43b1c97be976b0cb";
const MASTER_KEY = "$2a$10$BTJdm.bIPexVRHa49b2hve5ePA8cSigwLNdBWRzxo6fb4cSy53p3u";
const ALPHAVANTAGE_KEY = "8NS6OXY29LA15EEF";

export default async function handler(req, res) {
  const results = {};

  try {
    await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      headers: { "X-Master-Key": MASTER_KEY },
    });
    results.jsonbin = "✅ OK";
  } catch {
    results.jsonbin = "❌ Failed";
  }

  try {
    const resp = await axios.get("https://www.alphavantage.co/query", {
      params: { function: "EARNINGS_CALENDAR", symbol: "AAPL", apikey: ALPHAVANTAGE_KEY },
    });
    results.alphavantage = resp.data?.earningsCalendar ? "✅ OK" : "⚠️ Unexpected response";
  } catch {
    results.alphavantage = "❌ Failed";
  }

  res.status(200).json(results);
}
