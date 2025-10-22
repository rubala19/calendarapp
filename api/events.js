// /api/events.js
import { fetchEarningsAlphaVantage } from "../utils/fetchEarnings.js";

export default async function handler(req, res) {
  const BIN_ID = process.env.JSONBIN_ID;
  const BIN_KEY = process.env.JSONBIN_KEY;
  const AV_KEY = process.env.ALPHAVANTAGE_KEY;
  const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  if (!BIN_ID || !BIN_KEY) {
    return res.status(500).json({ error: "Missing JSONBin credentials" });
  }

  // 🔹 helper to safely load events from JSONBin
  async function loadEvents() {
    const resp = await fetch(`${BASE_URL}/latest`, {
      headers: { "X-Master-Key": BIN_KEY },
    });
    const json = await resp.json();

    let events = [];
    if (Array.isArray(json.record)) {
      events = json.record;
    } else if (json.record && Array.isArray(json.record.data)) {
      events = json.record.data;
    }
    if (!Array.isArray(events)) events = [];
    return events;
  }

  // 🔹 helper to save events back
  async function saveEvents(events) {
    await fetch(BASE_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": BIN_KEY,
      },
      body: JSON.stringify(events),
    });
  }

  try {
    // 🟢 GET: fetch all saved events
    if (req.method === "GET") {
      const events = await loadEvents();
      return res.status(200).json(events);
    }

    // 🟢 POST: add ticker, lookup earnings, append, persist
    if (req.method === "POST") {
      const { symbol } = req.body;
      if (!symbol)
        return res.status(400).json({ error: "Missing symbol in request" });

      let events = await loadEvents();

      // If event already exists, skip fetch
      const exists = events.find(
        (e) => e.symbol.toUpperCase() === symbol.toUpperCase()
      );
      if (exists) return res.status(200).json({ success: true, event: exists });

      // 🔍 Try Alpha Vantage lookup
      let newEvent = null;
      try {
        const apiUrl = `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&symbol=${symbol}&horizon=3month&apikey=${AV_KEY}`;
        const r = await fetch(apiUrl);
        const text = await r.text();

        const lines = text.trim().split("\n");
        if (lines.length > 1) {
          const first = lines[1].split(",");
          const [sym, name, reportDate, fiscalEnd, estimate, currency] = first;
          if (reportDate && reportDate !== "None") {
            newEvent = {
              symbol: sym || symbol.toUpperCase(),
              name: name || symbol.toUpperCase(),
              date: reportDate,
              fiscalDateEnding: fiscalEnd,
              estimate,
              currency,
              source: "AlphaVantage",
            };
          }
        }
      } catch (err) {
        console.error("AlphaVantage fetch failed:", err);
      }

      if (!newEvent) {
        return res
          .status(404)
          .json({ error: "No earnings date found for symbol" });
      }

      // Append + persist
      events.push(newEvent);
      await saveEvents(events);

      return res.status(200).json({ success: true, event: newEvent });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}
