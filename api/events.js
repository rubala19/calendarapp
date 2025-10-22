// /api/events.js
import axios from "axios";

const BIN_ID = "68f7ee9c43b1c97be976b0cb";
const MASTER_KEY = "$2a$10$BTJdm.bIPexVRHa49b2hve5ePA8cSigwLNdBWRzxo6fb4cSy53p3u";
const ALPHAVANTAGE_KEY = "8NS6OXY29LA15EEF";

const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const ALPHAVANTAGE_URL = "https://www.alphavantage.co/query";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // Fetch current events list
      const bin = await axios.get(JSONBIN_URL, {
        headers: { "X-Master-Key": MASTER_KEY },
      });
      return res.status(200).json(bin.data.record || []);
    }

    if (req.method === "POST") {
      const { symbol, date } = req.body;
      if (!symbol) return res.status(400).json({ error: "Symbol required" });

      // Lookup earnings date if not provided
      let earningsDate = date;
      let source = "manual";

      if (!earningsDate) {
        try {
          const resp = await axios.get(ALPHAVANTAGE_URL, {
            params: {
              function: "EARNINGS_CALENDAR",
              symbol,
              apikey: ALPHAVANTAGE_KEY,
            },
          });

          const item = resp.data?.earningsCalendar?.[0];
          if (item?.reportDate) {
            earningsDate = item.reportDate;
            source = "AlphaVantage";
          }
        } catch (err) {
          console.warn("AlphaVantage lookup failed, using fallback");
        }
      }

      if (!earningsDate) {
        earningsDate = "TBD";
        source = "fallback";
      }

      // Read, update, write to JSONBin
      const { data } = await axios.get(JSONBIN_URL, {
        headers: { "X-Master-Key": MASTER_KEY },
      });

      let events = data.record;
      if (!Array.isArray(events)) events = [];

      events.push({ symbol, date: earningsDate, source });
      events.sort((a, b) => new Date(a.date) - new Date(b.date));

      await axios.put(
        JSONBIN_URL,
        events,
        { headers: { "X-Master-Key": MASTER_KEY, "Content-Type": "application/json" } }
      );

      return res.status(200).json({ success: true, symbol, date: earningsDate, source });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
